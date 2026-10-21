import type { TourAvailability, ViatorTour } from "@/lib/tour-types";

/**
 * Viator Partner API (v2) client — server-side only (uses the secret API key).
 *
 * - Production keys  -> https://api.viator.com           (default)
 * - Sandbox keys     -> https://api.sandbox.viator.com   (set VIATOR_API_BASE_URL)
 * A key only works on the matching server, otherwise Viator returns 401.
 */
const BASE_URL = (process.env.VIATOR_API_BASE_URL || "https://api.viator.com").replace(/\/$/, "");
const LONDON_DESTINATION_ID = "737"; // Viator destination id for London
const REQUEST_TIMEOUT_MS = 10_000;
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;

export function isViatorConfigured(): boolean {
  return Boolean(process.env.VIATOR_API_KEY);
}

function viatorHeaders(): Record<string, string> {
  return {
    "exp-api-key": process.env.VIATOR_API_KEY ?? "",
    Accept: "application/json;version=2.0",
    "Accept-Language": "en-US",
    "Content-Type": "application/json",
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function formatDuration(minutes: number | undefined): string | null {
  if (!minutes || minutes <= 0) return null;
  if (minutes >= 1440) {
    const d = Math.round(minutes / 1440);
    return d === 1 ? "1 day" : `${d} days`;
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapProduct(p: any): ViatorTour | null {
  if (!p?.productCode || !p?.title || !p?.productUrl) return null;

  const d = p.duration ?? {};
  const durationText =
    formatDuration(d.fixedDurationInMinutes) ??
    (d.variableDurationFromMinutes && d.variableDurationToMinutes
      ? `${formatDuration(d.variableDurationFromMinutes)}–${formatDuration(d.variableDurationToMinutes)}`
      : null);

  const images: any[] = Array.isArray(p.images) ? p.images : [];
  const cover = images.find((i) => i?.isCover) ?? images[0];
  const variants: any[] = Array.isArray(cover?.variants) ? cover.variants : [];
  const variant =
    [...variants].sort((a, b) => a.width - b.width).find((v) => v.width >= 400) ??
    variants[variants.length - 1];

  return {
    productCode: p.productCode,
    title: p.title,
    fromPriceUSD: typeof p.pricing?.summary?.fromPrice === "number" ? p.pricing.summary.fromPrice : null,
    rating:
      typeof p.reviews?.combinedAverageRating === "number"
        ? Math.round(p.reviews.combinedAverageRating * 10) / 10
        : null,
    reviewCount: p.reviews?.totalReviews ?? 0,
    durationText,
    freeCancellation: Array.isArray(p.flags) && p.flags.includes("FREE_CANCELLATION"),
    imageUrl: variant?.url ?? null,
    bookingUrl: String(p.productUrl).trim(),
  };
}

const searchCache = new Map<string, { at: number; tours: ViatorTour[] }>();

/** Live search for bookable London tours matching an attraction name. */
export async function searchViatorTours(query: string, limit = 3): Promise<ViatorTour[]> {
  const cacheKey = `${query.toLowerCase()}|${limit}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.at < SEARCH_CACHE_TTL_MS) return cached.tours;

  // campaign-value is appended to productUrl so clicks are attributed per attraction
  const url = `${BASE_URL}/partner/search/freetext?campaign-value=${encodeURIComponent(slugify(query))}`;
  const res = await fetch(url, {
    method: "POST",
    headers: viatorHeaders(),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    body: JSON.stringify({
      searchTerm: query,
      productFiltering: { destination: LONDON_DESTINATION_ID },
      searchTypes: [{ searchType: "PRODUCTS", pagination: { start: 1, count: limit } }],
      currency: "USD",
    }),
  });

  if (!res.ok) {
    throw new Error(`Viator search failed for "${query}" (HTTP ${res.status})`);
  }

  const data = await res.json();
  const results: any[] = data?.products?.results ?? [];
  const tours = results.map(mapProduct).filter((t): t is ViatorTour => t !== null);

  searchCache.set(cacheKey, { at: Date.now(), tours });
  return tours;
}

/**
 * Real-time availability + price for one product on one date.
 * Returns "unknown" (never throws) if Viator can't answer, so the UI can fall
 * back to the "from" price instead of showing a wrong "unavailable".
 */
export async function checkViatorAvailability(
  productCode: string,
  travelDate: string,
  adults: number
): Promise<TourAvailability> {
  try {
    const res = await fetch(`${BASE_URL}/partner/availability/check`, {
      method: "POST",
      headers: viatorHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      body: JSON.stringify({
        productCode,
        travelDate,
        currency: "USD",
        paxMix: [{ ageBand: "ADULT", numberOfTravelers: adults }],
      }),
    });

    if (!res.ok) return { status: "unknown", travelDate };

    const data = await res.json();
    const items: any[] = Array.isArray(data?.bookableItems) ? data.bookableItems : [];
    const open = items.filter((i) => i?.available);
    if (open.length === 0) return { status: "unavailable", travelDate };

    const prices = open
      .map((i) => i?.totalPrice?.price?.recommendedRetailPrice)
      .filter((n): n is number => typeof n === "number");

    return {
      status: "available",
      travelDate,
      totalPriceUSD: prices.length ? Math.min(...prices) : undefined,
    };
  } catch {
    return { status: "unknown", travelDate };
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
