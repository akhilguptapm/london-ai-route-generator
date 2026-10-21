import { Camera, Compass, Utensils, Coffee, Info, MapPin, ExternalLink } from "lucide-react";
import type { ViatorTour } from "@/lib/tour-types";
import type { Itinerary } from "@/lib/schema";
import { getGoCityLondonPassLink } from "@/lib/affiliates";

type ScheduleItem = Itinerary["days"][number]["schedule"][number];
type Plan = NonNullable<ScheduleItem["fallback"]>;
// The itinerary streams in as a partial object, so every field may still be missing.
export type FallbackPlan = {
  photoTip?: string;
  nearbyAlternative?: Partial<Plan["nearbyAlternative"]>;
  mealSuggestion?: Partial<NonNullable<Plan["mealSuggestion"]>> | null;
};

type MealType = "breakfast" | "coffee" | "lunch" | "dinner";

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function mealLabel(type: MealType): string {
  return type === "coffee" ? "Coffee break" : type[0].toUpperCase() + type.slice(1);
}

function parseMinutes(text: string): number | null {
  const m = text.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return null;
  let h = Number(m[1]) % 24;
  const mer = m[3]?.toUpperCase();
  if (mer === "PM" && h < 12) h += 12;
  if (mer === "AM" && h === 12) h = 0;
  return h * 60 + Number(m[2]);
}

/**
 * Decide the meal label from the actual time slot (e.g. "11:30 AM - 01:30 PM") so it can never
 * contradict the schedule. Falls back to the model's suggestion if the slot can't be parsed.
 */
function mealTypeForSlot(timeSlot: string | undefined, modelType: MealType | undefined): MealType {
  const parts = (timeSlot ?? "").split(/\s[-–—]\s|\sto\s/i);
  const start = parseMinutes(parts[0] ?? "");
  const end = parts[1] ? parseMinutes(parts[1]) : null;
  if (start === null) return modelType ?? "coffee";
  const last = end !== null && end > start ? end : start;

  const overlaps = (from: number, to: number) => start < to && last > from;
  if (overlaps(12 * 60, 14 * 60 + 30)) return "lunch";
  if (overlaps(18 * 60, 21 * 60)) return "dinner";
  if (start < 10 * 60) return "breakfast";
  return "coffee";
}

function mapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${query}, London`)}`;
}

/**
 * True when we looked up tours for the attraction and none can be booked:
 * either Viator returned nothing, or every tour is unavailable on the chosen date.
 * Returns false while data is missing (lookup failed / not loaded) so we never show the suggestion by mistake.
 */
export function hasNoBookableTours(tours: ViatorTour[] | undefined): boolean {
  if (!tours) return false;
  if (tours.length === 0) return true;
  return tours.every((t) => t.availability?.status === "unavailable");
}

function ActionLink({
  href,
  children,
  icon: Icon = ExternalLink,
  sponsored = false,
}: {
  href: string;
  children: React.ReactNode;
  icon?: typeof ExternalLink;
  sponsored?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel={sponsored ? "noopener noreferrer sponsored" : "noopener noreferrer"}
      className="inline-flex items-center gap-1.5 py-1 text-xs font-bold text-sky-400 hover:text-sky-300"
    >
      <Icon className="w-3 h-3" />
      {children}
    </a>
  );
}

export function TourFallback({
  attractionName,
  timeSlot,
  fallback,
  tours,
  alternativeTours,
  isLondonPassIncluded,
}: {
  attractionName: string;
  timeSlot: string | undefined;
  fallback: FallbackPlan;
  tours: ViatorTour[] | undefined;
  /** Live Viator tours for the nearby alternative (when it is a ticketed sight) */
  alternativeTours: ViatorTour[] | undefined;
  isLondonPassIncluded: boolean;
}) {
  const date = tours?.find((t) => t.availability?.status === "unavailable")?.availability?.travelDate;

  const meal = fallback.mealSuggestion;
  const mealType = meal?.name ? mealTypeForSlot(timeSlot, meal.mealType) : undefined;
  const MealIcon = mealType === "coffee" ? Coffee : Utensils;

  const alt = fallback.nearbyAlternative;
  const altBooking = alternativeTours?.find((t) => t.availability?.status !== "unavailable");

  return (
    <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3 sm:p-4 space-y-3">
      <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
        Alternate Route Suggestion
      </div>
      <div className="flex items-start gap-2 text-sm text-amber-200">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
        <p>
          {date
            ? `No tours or tickets for ${attractionName} are available on ${formatDate(date)}.`
            : `No tours or tickets for ${attractionName} are available right now.`}{" "}
          <span className="text-amber-300/80">
            Here&apos;s an alternate route so this slot is still worth it
            {isLondonPassIncluded && (
              <>
                {" "}
                (your London Pass may still cover direct entry —{" "}
                <a
                  href={getGoCityLondonPassLink()}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="font-semibold text-amber-300 underline underline-offset-2 hover:text-amber-200"
                >
                  check the official site
                </a>{" "}
                for slots)
              </>
            )}
            .
          </span>
        </p>
      </div>

      <ul className="space-y-2 text-sm">
        {fallback.photoTip && (
          <li className="flex items-start gap-2.5 bg-slate-950/60 border border-slate-800 rounded-lg p-3">
            <Camera className="w-4 h-4 shrink-0 mt-0.5 text-sky-400" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                See it from outside
              </div>
              <p className="text-slate-300">{fallback.photoTip}</p>
              <ActionLink href={mapsUrl(attractionName)} icon={MapPin}>
                View on Maps
              </ActionLink>
            </div>
          </li>
        )}

        {alt?.name && (
          <li className="flex items-start gap-2.5 bg-slate-950/60 border border-slate-800 rounded-lg p-3">
            <Compass className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Nearby alternative · {alt.name}
              </div>
              <p className="text-slate-300">{alt.description}</p>
              <div className="flex flex-wrap gap-x-4">
                <ActionLink href={mapsUrl(alt.name)} icon={MapPin}>
                  View on Maps
                </ActionLink>
                {altBooking && (
                  <ActionLink href={altBooking.bookingUrl} sponsored>
                    Book {alt.name}
                  </ActionLink>
                )}
              </div>
            </div>
          </li>
        )}

        {meal?.name && mealType && (
          <li className="flex items-start gap-2.5 bg-slate-950/60 border border-slate-800 rounded-lg p-3">
            <MealIcon className="w-4 h-4 shrink-0 mt-0.5 text-purple-400" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-purple-400">
                {mealLabel(mealType)} · {meal.name}
              </div>
              <p className="text-slate-300">{meal.description}</p>
              <ActionLink href={mapsUrl(meal.name)} icon={MapPin}>
                View on Maps
              </ActionLink>
            </div>
          </li>
        )}
      </ul>
    </div>
  );
}
