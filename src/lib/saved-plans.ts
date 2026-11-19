import { randomBytes } from "node:crypto";
import { cache } from "react";
import { Redis } from "@upstash/redis";
import { z } from "zod";
import { ItinerarySchema, type Itinerary } from "@/lib/schema";
import { redisCredentials } from "@/lib/redis-env";
import { SHARE_TTL_SECONDS, isShareId } from "@/lib/share-plan";
import { normalizeTripRequest, type TripRequest } from "@/lib/trip-options";

// Saved itineraries are a different store from the 24-hour search cache.
// Each plan gets its own unguessable id and is deleted by Redis when the 90-day TTL elapses.

const KEY_PREFIX = "share:v1:";
const MAX_BODY_CHARS = 200_000;

const StoredPlanSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  expiresAt: z.string(),
  trip: z.object({
    days: z.number().int(),
    pace: z.string(),
    travelers: z.string(),
    interests: z.array(z.string()),
    startLocation: z.string(),
    travelDate: z.string().nullable(),
  }),
  itinerary: ItinerarySchema,
});

export type SavedTrip = TripRequest & { travelDate: string | null };
export type SavedPlan = z.infer<typeof StoredPlanSchema>;

const TRAVEL_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseShareRequest(body: unknown): { trip: SavedTrip; itinerary: Itinerary } | null {
  if (!body || typeof body !== "object") return null;
  if (JSON.stringify(body).length > MAX_BODY_CHARS) return null;

  const record = body as Record<string, unknown>;
  const tripBase = normalizeTripRequest(record);
  const travelDate =
    typeof record.travelDate === "string" && TRAVEL_DATE.test(record.travelDate) ? record.travelDate : null;

  const parsed = ItinerarySchema.safeParse(record.itinerary);
  if (!parsed.success) return null;

  const itinerary = parsed.data;
  const complete =
    itinerary.tripTitle.trim().length > 0 &&
    itinerary.days.length === tripBase.days &&
    itinerary.days.every((day) => day.theme.trim().length > 0 && day.schedule.length > 0);
  if (!complete) return null;

  return { trip: { ...tripBase, travelDate }, itinerary };
}

let redis: Redis | null | undefined;
function getRedis(): Redis | null {
  if (redis === undefined) {
    const creds = redisCredentials();
    redis = creds ? new Redis({ ...creds, automaticDeserialization: false }) : null;
  }
  return redis;
}

// Dev-only fallback. Next bundles the route and the page separately, so a plain module Map
// would not be visible to both. Production always uses Redis (see savePlan).
const memory: Map<string, { value: string; expiresAt: number }> = (() => {
  const holder = globalThis as unknown as {
    __savedPlans?: Map<string, { value: string; expiresAt: number }>;
  };
  holder.__savedPlans ??= new Map();
  return holder.__savedPlans;
})();

function memoryGet(key: string): string | null {
  const hit = memory.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    memory.delete(key);
    return null;
  }
  return hit.value;
}

function readStored(raw: string): SavedPlan | null {
  try {
    const parsed = StoredPlanSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    if (Date.parse(parsed.data.expiresAt) <= Date.now()) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export async function savePlan(input: { trip: SavedTrip; itinerary: Itinerary }): Promise<SavedPlan> {
  const now = Date.now();
  const plan: SavedPlan = {
    id: randomBytes(12).toString("base64url"),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SHARE_TTL_SECONDS * 1000).toISOString(),
    trip: input.trip,
    itinerary: input.itinerary,
  };
  const payload = JSON.stringify(plan);
  const client = getRedis();

  if (!client) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Redis is not configured");
    }
    memory.set(KEY_PREFIX + plan.id, { value: payload, expiresAt: now + SHARE_TTL_SECONDS * 1000 });
    return plan;
  }

  await client.set(KEY_PREFIX + plan.id, payload, { ex: SHARE_TTL_SECONDS });
  return plan;
}

export const getSavedPlan = cache(async (id: string): Promise<SavedPlan | null> => {
  if (!isShareId(id)) return null;
  const key = KEY_PREFIX + id;
  const client = getRedis();

  if (!client) {
    const raw = memoryGet(key);
    return raw ? readStored(raw) : null;
  }

  try {
    const value = await client.get<unknown>(key);
    if (value == null) return null;
    const raw = typeof value === "string" ? value : JSON.stringify(value);
    return readStored(raw);
  } catch (error) {
    console.error("[saved-plans] read failed:", error);
    return null;
  }
});
