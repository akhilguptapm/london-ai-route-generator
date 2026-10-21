import {
  checkViatorAvailability,
  isViatorConfigured,
  searchViatorTours,
} from "@/lib/viator";
import type { ToursApiResponse, ViatorTour } from "@/lib/tour-types";

export const maxDuration = 60;

const MAX_QUERIES = 30;
const CONCURRENCY = 5;

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

function isValidFutureDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return !Number.isNaN(d.getTime()) && d.getTime() >= today.getTime();
}

const AVAILABILITY_ORDER = { available: 0, unknown: 1, unavailable: 2 } as const;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const queries: string[] = Array.from(
      new Set(
        (Array.isArray(body?.queries) ? body.queries : [])
          .filter((q: unknown): q is string => typeof q === "string")
          .map((q: string) => q.trim())
          .filter((q: string) => q.length > 0 && q.length <= 80)
      )
    ).slice(0, MAX_QUERIES) as string[];

    const adults = Math.min(Math.max(Number(body?.adults) || 2, 1), 10);
    const travelDate = isValidFutureDate(body?.travelDate) ? body.travelDate : null;

    const empty: ToursApiResponse = { results: {}, configured: isViatorConfigured(), failedLookups: 0 };
    if (!isViatorConfigured() || queries.length === 0) return Response.json(empty);

    // 1) Live tour search for every attraction
    let failedLookups = 0;
    const searched = await mapLimit(queries, CONCURRENCY, async (query) => {
      try {
        return { query, tours: await searchViatorTours(query, 3) };
      } catch (error) {
        failedLookups++;
        console.error(error);
        return { query, tours: [] as ViatorTour[] };
      }
    });

    // 2) Real-time availability + total price for the chosen date (optional)
    if (travelDate) {
      const all = searched.flatMap(({ tours }) => tours);
      await mapLimit(all, CONCURRENCY, async (tour) => {
        tour.availability = await checkViatorAvailability(tour.productCode, travelDate, adults);
      });
    }

    const results: Record<string, ViatorTour[]> = {};
    for (const { query, tours } of searched) {
      results[query] = travelDate
        ? [...tours].sort(
            (a, b) =>
              AVAILABILITY_ORDER[a.availability?.status ?? "unknown"] -
              AVAILABILITY_ORDER[b.availability?.status ?? "unknown"]
          )
        : tours;
    }

    const response: ToursApiResponse = { results, configured: true, failedLookups };
    return Response.json(response);
  } catch (error) {
    console.error("Error fetching live tours:", error);
    return Response.json({ error: "Failed to fetch tours" }, { status: 500 });
  }
}
