// Single source of truth for the trip form options. Used by the UI, and by the API to normalise
// incoming requests so that equivalent searches produce the same cache key.

export const AVAILABLE_INTERESTS = [
  "Historical Palaces",
  "Museums",
  "Family Friendly",
  "Food & Markets",
  "Hidden Gems",
  "Parks & Views",
] as const;

export const PACES = [
  { value: "Relaxed", label: "Relaxed (2 sights/day)" },
  { value: "Balanced", label: "Balanced (3 sights/day)" },
  { value: "Fast-Paced", label: "Fast-Paced (4+ sights/day)" },
] as const;

export const TRAVELER_TYPES = [
  "Solo Traveler",
  "Couple / 2 Adults",
  "Family with Kids",
  "Group of Friends",
] as const;

export const DEFAULT_PACE = "Balanced";
export const DEFAULT_TRAVELERS = "Couple / 2 Adults";
export const DEFAULT_INTERESTS: string[] = ["Historical Palaces", "Museums", "Food & Markets"];
export const DEFAULT_START_LOCATION = "Central London";
export const MIN_DAYS = 1;
export const MAX_DAYS = 7;

export type TripRequest = {
  days: number;
  pace: string;
  travelers: string;
  /** Always in AVAILABLE_INTERESTS order, so selection order never changes the cache key. */
  interests: string[];
  startLocation: string;
};

/** Coerce an untrusted request body into a clean, canonical TripRequest. */
export function normalizeTripRequest(body: unknown): TripRequest {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;

  const days = Math.max(MIN_DAYS, Math.min(Math.trunc(Number(b.days)) || MIN_DAYS, MAX_DAYS));

  const pace = PACES.some((p) => p.value === b.pace) ? (b.pace as string) : DEFAULT_PACE;

  const travelers = (TRAVELER_TYPES as readonly string[]).includes(b.travelers as string)
    ? (b.travelers as string)
    : DEFAULT_TRAVELERS;

  const picked = new Set(Array.isArray(b.interests) ? b.interests : []);
  const interests = AVAILABLE_INTERESTS.filter((i) => picked.has(i)) as string[];

  const startLocation =
    typeof b.startLocation === "string" && b.startLocation.trim()
      ? b.startLocation.trim().replace(/\s+/g, " ").slice(0, 80)
      : DEFAULT_START_LOCATION;

  return { days, pace, travelers, interests, startLocation };
}
