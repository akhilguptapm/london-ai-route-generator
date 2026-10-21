import {
  ALL_INCLUSIVE_MAX_CREDITS_GBP,
  ALL_INCLUSIVE_PRICES_USD,
  EXPLORER_PRICES_USD,
  GBP_TO_USD_GOCITY,
  GOCITY_ATTRACTIONS,
  type GoCityAttraction,
} from "@/lib/gocity-attractions";
import type { ViatorTour } from "@/lib/tour-types";

/**
 * Deterministic London Pass (Go City) savings, in USD, per adult.
 *
 * savings = walk-up price of the covered attractions in the itinerary − price of the cheapest
 * Go City pass that covers them. Both sides use Go City's own USD figures (see gocity-attractions.ts),
 * which is how Go City's savings guarantee is calculated. Nothing here is AI-generated.
 */

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[’'`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|a|an)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const INDEX = GOCITY_ATTRACTIONS.map((attraction) => ({
  attraction,
  // Full product names + explicit aliases only. We deliberately do NOT fuzzy-match short names
  // (e.g. "British Museum" is free, "Buckingham Palace" is not the Royal Mews) to avoid false claims.
  keys: [attraction.name, ...(attraction.aliases ?? [])].map(normalize).filter((k) => k.length >= 4),
}));

/** Returns the Go City attraction an itinerary stop corresponds to, or null if not covered. */
export function matchGoCityAttraction(attractionName: string | null | undefined): GoCityAttraction | null {
  if (!attractionName) return null;
  const n = normalize(attractionName);
  if (!n) return null;
  const padded = ` ${n} `;
  let best: { attraction: GoCityAttraction; len: number } | null = null;
  for (const { attraction, keys } of INDEX) {
    for (const key of keys) {
      // whole-word containment: "tower of london" in "tower of london and crown jewels"
      if (padded.includes(` ${key} `) && (!best || key.length > best.len)) {
        best = { attraction, len: key.length };
      }
    }
  }
  return best?.attraction ?? null;
}

/** Viator products that are plain entry tickets (not guided tours, cruises or combo experiences). */
const ENTRY_TICKET_RE = /\b(entry|entrance|admission|ticket|tickets|fast[- ]track|skip[- ]the[- ]line)\b/i;

/**
 * Live per-adult entry price (USD) from Viator search results, or null when Viator has no matching
 * entry ticket. Uses the date-specific live total when available, else Viator's live "from" price.
 */
export function viatorEntryPriceUSD(tours: ViatorTour[] | undefined, adults: number): number | null {
  if (!tours?.length) return null;
  const prices: number[] = [];
  for (const t of tours) {
    if (!ENTRY_TICKET_RE.test(t.title) || t.availability?.status === "unavailable") continue;
    const live =
      t.availability?.status === "available" && t.availability.totalPriceUSD !== undefined
        ? t.availability.totalPriceUSD / Math.max(adults, 1)
        : t.fromPriceUSD;
    if (typeof live === "number" && live > 0) prices.push(live);
  }
  return prices.length ? Math.min(...prices) : null;
}

/**
 * Viator and Go City describe the same gate, so their prices should be close. If Viator's entry price is
 * wildly different it is probably a different product (e.g. a bundle or a cheaper add-on) — ignore it.
 */
const SANE_MIN = 0.7;
const SANE_MAX = 1.3;

export interface PassRecommendation {
  passType: "explorer" | "allInclusive";
  /** e.g. "3-attraction Explorer Pass" or "2-day All-Inclusive Pass" */
  passLabel: string;
  passPriceUSD: number;
  /** Estimated total walk-up gate price of the covered attractions (per adult), low–high. */
  gateTotalLowUSD: number;
  gateTotalHighUSD: number;
  /** Estimated saving per adult, low–high (whole dollars, conservative). */
  savingsLowUSD: number;
  savingsHighUSD: number;
  coveredCount: number;
  /** How many covered attractions were cross-checked against live Viator entry prices. */
  liveRatesUsed: number;
}

interface StopLike {
  attractionName?: string | null;
  tourSearchTerm?: string | null;
}
interface DayLike {
  schedule?: (StopLike | undefined)[] | null;
}

interface Covered {
  attraction: GoCityAttraction;
  dayIdx: number;
  lowUSD: number;
  highUSD: number;
  live: boolean;
}

/**
 * Best pass for this itinerary (per adult), or null when no itinerary stop is covered by a Go City pass.
 * The returned pass may still not save money (savingsLowUSD < 1) — the UI must not claim savings then.
 *
 * `viatorPriceFor` optionally supplies a live Viator entry price (USD per adult) for a stop. Where it
 * is available and plausible, the estimate becomes a range between the Go City published gate price and
 * the live Viator price; otherwise it falls back to Go City's published price alone.
 */
export function calculatePassSavings(
  days: (DayLike | undefined)[] | undefined,
  viatorPriceFor?: (stop: StopLike) => number | null
): PassRecommendation | null {
  if (!days?.length) return null;

  const covered = new Map<string, Covered>();
  days.forEach((day, dayIdx) => {
    for (const stop of day?.schedule ?? []) {
      const m = matchGoCityAttraction(stop?.attractionName);
      if (!m || covered.has(m.name)) continue;
      const gc = m.walkUpUSD;
      let v: number | null = null;
      try {
        v = stop && viatorPriceFor ? viatorPriceFor(stop) : null;
      } catch {
        v = null; // never let a price lookup break the banner
      }
      const live = v !== null && v >= gc * SANE_MIN && v <= gc * SANE_MAX;
      covered.set(m.name, {
        attraction: m,
        dayIdx,
        lowUSD: live ? Math.min(gc, v as number) : gc,
        highUSD: live ? Math.max(gc, v as number) : gc,
        live,
      });
    }
  });
  if (covered.size === 0) return null;

  const all = [...covered.values()];
  const liveRatesUsed = all.filter((c) => c.live).length;
  const sum = (xs: number[]) => xs.reduce((t, x) => t + x, 0);
  const desc = (xs: number[]) => [...xs].sort((x, y) => y - x);

  const options: PassRecommendation[] = [];
  // Go City prices are rounded to whole dollars, so each attraction can be off by up to $0.50.
  // Deduct that margin from the LOW end so we under-promise.
  const margin = (n: number) => 0.5 * n;
  const push = (
    o: Pick<PassRecommendation, "passType" | "passLabel" | "passPriceUSD" | "coveredCount">,
    gateLow: number,
    gateHigh: number
  ) => {
    const lo = Math.floor(gateLow - o.passPriceUSD - margin(o.coveredCount));
    const hi = Math.max(lo, Math.floor(gateHigh - o.passPriceUSD));
    options.push({
      ...o,
      gateTotalLowUSD: Math.round(gateLow),
      gateTotalHighUSD: Math.round(gateHigh),
      savingsLowUSD: lo,
      savingsHighUSD: hi,
      liveRatesUsed,
    });
  };

  // Explorer Pass: N credits, spent on the priciest Explorer-eligible attractions.
  const eligible = all.filter((c) => c.attraction.tier === "explorer");
  for (let n = 2; n <= 7 && n <= eligible.length; n++) {
    push(
      { passType: "explorer", passLabel: `${n}-attraction Explorer Pass`, passPriceUSD: EXPLORER_PRICES_USD[n], coveredCount: n },
      sum(desc(eligible.map((c) => c.lowUSD)).slice(0, n)),
      sum(desc(eligible.map((c) => c.highUSD)).slice(0, n))
    );
  }

  // All-Inclusive Pass: consecutive days spanning first..last day with a covered attraction.
  const dayIdxs = all.map((c) => c.dayIdx);
  const spanDays = Math.max(...dayIdxs) - Math.min(...dayIdxs) + 1;
  const passDays = [1, 2, 3, 4, 5, 6, 7, 10].find((d) => d >= spanDays);
  if (passDays !== undefined) {
    const cap = ALL_INCLUSIVE_MAX_CREDITS_GBP[passDays] * GBP_TO_USD_GOCITY; // pass credits cap coverage
    push(
      {
        passType: "allInclusive",
        passLabel: `${passDays}-day All-Inclusive Pass`,
        passPriceUSD: ALL_INCLUSIVE_PRICES_USD[passDays],
        coveredCount: all.length,
      },
      Math.min(sum(all.map((c) => c.lowUSD)), cap),
      Math.min(sum(all.map((c) => c.highUSD)), cap)
    );
  }

  const best = options.sort((x, y) => y.savingsLowUSD - x.savingsLowUSD)[0];
  // May be zero/negative: callers must check `savingsLowUSD >= 1` before claiming any savings.
  return best ?? null;
}

/** "~$75–$80", or "~$75" when the range collapses. */
export function formatSavingsRange(rec: Pick<PassRecommendation, "savingsLowUSD" | "savingsHighUSD">): string {
  const f = (n: number) => `$${n.toLocaleString("en-US")}`;
  return rec.savingsHighUSD > rec.savingsLowUSD
    ? `~${f(rec.savingsLowUSD)}–${f(rec.savingsHighUSD)}`
    : `~${f(rec.savingsLowUSD)}`;
}
