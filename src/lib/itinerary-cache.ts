import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";
import { redisCredentials } from "@/lib/redis-env";
import type { TripRequest } from "@/lib/trip-options";

// Caches fully generated itineraries so repeat searches (e.g. the default "3 days, first-timers" form)
// load instantly and cost zero tokens.
//
// Backend: Upstash Redis (Vercel Marketplace) when its env vars are present, otherwise a small in-memory
// map so local development works with no setup. Every cache failure is treated as a miss - the cache must
// never be able to break generation.

/** Bump whenever the prompts, schema or model change, so stale itineraries are never served. */
export const CACHE_VERSION = "v1";
// Short on purpose: popular searches stay warm (each hit saves tokens) while itineraries - and the
// opening hours / venues they mention - are refreshed daily. Re-run `npm run pregenerate` to re-warm.
export const CACHE_TTL_SECONDS = 60 * 60 * 24; // 24 hours

const KEY_PREFIX = `itinerary:${CACHE_VERSION}:`;
const MEMORY_MAX_ENTRIES = 200;

export function buildCacheKey(trip: TripRequest, model: string): string {
  const canonical = JSON.stringify([
    model,
    trip.days,
    trip.pace,
    trip.travelers,
    trip.interests,
    trip.startLocation.toLowerCase(),
  ]);
  return KEY_PREFIX + createHash("sha256").update(canonical).digest("hex").slice(0, 32);
}

let redis: Redis | null | undefined; // undefined = not initialised yet
function getRedis(): Redis | null {
  if (redis === undefined) {
    const creds = redisCredentials();
    // Values are stored as raw JSON text, so turn off auto-parsing on reads.
    redis = creds ? new Redis({ ...creds, automaticDeserialization: false }) : null;
    if (!creds && process.env.NODE_ENV === "production") {
      console.warn("[itinerary-cache] No Redis configured - falling back to per-instance memory cache.");
    }
  }
  return redis;
}

const memory = new Map<string, { value: string; expiresAt: number }>();

function memoryGet(key: string): string | null {
  const hit = memory.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    memory.delete(key);
    return null;
  }
  return hit.value;
}

function memorySet(key: string, value: string) {
  if (memory.size >= MEMORY_MAX_ENTRIES) {
    const oldest = memory.keys().next().value; // Map iterates in insertion order
    if (oldest !== undefined) memory.delete(oldest);
  }
  memory.set(key, { value, expiresAt: Date.now() + CACHE_TTL_SECONDS * 1000 });
}

/** Returns the cached itinerary JSON text, or null on a miss / any error. */
export async function getCachedItinerary(key: string): Promise<string | null> {
  const client = getRedis();
  if (!client) return memoryGet(key);
  try {
    const value = await client.get<unknown>(key);
    if (value == null) return null;
    return typeof value === "string" ? value : JSON.stringify(value);
  } catch (error) {
    console.error("[itinerary-cache] read failed, treating as miss:", error);
    return null;
  }
}

export async function setCachedItinerary(key: string, value: string): Promise<void> {
  const client = getRedis();
  if (!client) return memorySet(key, value);
  try {
    await client.set(key, value, { ex: CACHE_TTL_SECONDS });
  } catch (error) {
    console.error("[itinerary-cache] write failed:", error);
  }
}
