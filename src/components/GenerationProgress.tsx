"use client";

import { useEffect, useState } from "react";
import { CarTaxiFront } from "lucide-react";

// Shown while the itinerary streams in. Before the first bytes arrive we're "hailing the cab";
// once the trip starts taking shape, "London Cab is navigating your stops...".
const HAILING_MESSAGES = [
  "Hailing a London cab…",
  "Reading your trip brief…",
  "Plotting the smartest route across the city…",
];

const NAVIGATING_MESSAGES = [
  "London Cab is navigating your stops…",
  "Checking the Tube map for shortcuts…",
  "Finding a great spot for lunch nearby…",
  "Lining up the best photo spots…",
  "Mind the gap — double-checking transit tips…",
];

const ROTATE_MS = 2800;

type Props = {
  /** Days the traveller asked for. */
  totalDays: number;
  /** Days that have started appearing in the stream. */
  startedDays: number;
  /** True once the trip title / first day has begun streaming. */
  hasStarted: boolean;
};

export function GenerationProgress({ totalDays, startedDays, hasStarted }: Props) {
  const messages = hasStarted ? NAVIGATING_MESSAGES : HAILING_MESSAGES;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  const message = messages[tick % messages.length];
  const shownDays = Math.min(Math.max(startedDays, 0), totalDays);
  // Keep a visible sliver of progress from the first moment, so the bar never looks stuck at zero.
  const percent = Math.max(6, Math.round((shownDays / Math.max(totalDays, 1)) * 100));

  return (
    <div
      role="status"
      className="bg-gradient-to-r from-amber-50 via-white to-sky-50 border border-amber-200 rounded-2xl p-4 sm:p-5 space-y-3 animate-fade-in"
    >
      {/* Screen readers get a stable message; the rotating copy below is decorative. */}
      <span className="sr-only">
        Planning your London itinerary
        {hasStarted ? `: ${shownDays} of ${totalDays} days in progress` : ""}
      </span>

      <div aria-hidden="true" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p key={message} className="text-sm sm:text-base font-semibold text-slate-900 animate-fade-in">
            {message}
          </p>
          <span className="text-xs font-semibold text-amber-800 bg-amber-100 border border-amber-200 rounded-full px-2.5 py-1 whitespace-nowrap shrink-0">
            {hasStarted ? `Day ${Math.max(shownDays, 1)} of ${totalDays}` : "Starting…"}
          </span>
        </div>

        {/* The road: dashed markings scroll while the cab drives along it. Both stop for reduced-motion users. */}
        <div className="relative h-8 overflow-hidden rounded-lg bg-slate-800">
          <div
            className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 motion-safe:animate-road-scroll"
            style={{
              backgroundImage: "repeating-linear-gradient(to right, #fbbf24 0 12px, transparent 12px 24px)",
              backgroundSize: "24px 100%",
            }}
          />
          <CarTaxiFront
            className="absolute top-1/2 -mt-3 w-6 h-6 text-amber-400 drop-shadow motion-safe:animate-cab-drive left-2 motion-reduce:left-1/2"
            strokeWidth={2.25}
          />
        </div>

        {/* Real progress: how many of the requested days have begun streaming in. */}
        <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-sky-500 transition-[width] duration-700 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
