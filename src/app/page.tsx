"use client";

import { useEffect, useMemo, useState } from "react";
import { useObject } from "@ai-sdk/react";
import { ItinerarySchema } from "@/lib/schema";
import { GenerationProgress } from "@/components/GenerationProgress";
import { DaySkeleton } from "@/components/DaySkeleton";
import { ItineraryResults } from "@/components/ItineraryResults";
import { SharePlan } from "@/components/SharePlan";
import {
  AVAILABLE_INTERESTS,
  DEFAULT_INTERESTS,
  PACES,
  TRAVELER_TYPES,
  adultsForTravelers,
} from "@/lib/trip-options";
import { PLANNER_BASE_PATH } from "@/lib/share-plan";
import {
  Compass,
  Clock,
  Ticket,
  Sparkles,
  Calendar,
  Users,
  AlertTriangle,
} from "lucide-react";

export default function Home() {
  const [days, setDays] = useState<number>(3);
  const [pace, setPace] = useState<string>("Balanced");
  const [travelers, setTravelers] = useState<string>("Couple / 2 Adults");
  const [travelDate, setTravelDate] = useState<string>("");
  // Number of days asked for in the last generation (so the "missing days" notice ignores later form edits).
  const [requestedDays, setRequestedDays] = useState<number | null>(null);
  // Set on the client after mount (can't read the current time during prerender)
  const [minDate, setMinDate] = useState<string>("");
  useEffect(() => {
    setMinDate(new Date().toISOString().slice(0, 10));
  }, []);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(DEFAULT_INTERESTS);
  // Bumped on each Generate click so a new trip does not reuse the previous share link or tour lookup.
  const [planVersion, setPlanVersion] = useState(0);
  // The options that produced the itinerary on screen. Later form edits must not change the saved plan.
  const [generatedTrip, setGeneratedTrip] = useState<{
    days: number;
    pace: string;
    travelers: string;
    interests: string[];
  } | null>(null);
  // True when the last itinerary was served from the server-side cache (X-Cache: HIT).
  const [servedFromCache, setServedFromCache] = useState(false);

  const {
    object: itinerary,
    submit,
    isLoading,
    stop,
    error,
  } = useObject({
    api: `${PLANNER_BASE_PATH}/api/generate`,
    schema: ItinerarySchema,
    // Peek at the response headers to learn whether this trip came from the cache.
    fetch: async (input, init) => {
      const res = await fetch(input, init);
      setServedFromCache(res.headers.get("X-Cache") === "HIT");
      return res;
    },
  });

  const adults = adultsForTravelers(travelers);

  // A 429 from the API arrives as the error message (the JSON response body); show its friendly text.
  const rateLimitMessage = useMemo(() => {
    if (!error) return null;
    try {
      const body = JSON.parse(error.message);
      return body?.error === "rate_limited" && typeof body.message === "string" ? body.message : null;
    } catch {
      return null;
    }
  }, [error]);

  // Days that actually came back with a theme and stops (the stream can end with an empty trailing day).
  const plannedDays = (itinerary?.days ?? []).filter((d) => d?.theme?.trim() && d?.schedule?.length).length;
  // Days that have begun streaming in (even if still being written) - drives the progress indicator.
  const startedDays = (itinerary?.days ?? []).filter((d) => d?.theme?.trim()).length;

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const canShare =
    !isLoading && !error && requestedDays !== null && plannedDays === requestedDays && plannedDays > 0;

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setServedFromCache(false);
    setRequestedDays(days);
    setGeneratedTrip({
      days,
      pace,
      travelers,
      interests: [...selectedInterests],
    });
    setPlanVersion((version) => version + 1);
    submit({
      days,
      pace,
      travelers,
      interests: selectedInterests,
    });
  };

  return (
    <main className="flex-1 bg-white text-slate-900 px-3 py-4 sm:p-6 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        {/* Header Section */}
        <header className="text-center space-y-3 py-4 sm:py-6 border-b border-slate-200">
          <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold border border-amber-200">
            <Sparkles className="w-4 h-4 shrink-0" /> AI Route & Itinerary Generator
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 text-balance break-words">
            AI-Powered London Itinerary & Custom Tour Planner
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto text-sm md:text-base">
            Plan custom London itineraries in seconds. Get AI-optimized routes, tube transit tips, live tour ticket rates, and London Pass savings. Build your route now!
          </p>
        </header>

        {/* Form Controls */}
        <form
          onSubmit={handleGenerate}
          className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-5 sm:space-y-6 shadow-xl"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Days Counter */}
            <div className="space-y-2">
              <label
                htmlFor="days"
                className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2"
              >
                <Calendar className="w-4 h-4 text-sky-700" /> Trip Duration
              </label>
              <select
                id="days"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? "Day" : "Days"} in London
                  </option>
                ))}
              </select>
            </div>

            {/* Pace Selector */}
            <div className="space-y-2">
              <label
                htmlFor="pace"
                className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2"
              >
                <Clock className="w-4 h-4 text-emerald-700" /> Travel Pace
              </label>
              <select
                id="pace"
                value={pace}
                onChange={(e) => setPace(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {PACES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Travelers */}
            <div className="space-y-2">
              <label
                htmlFor="travelers"
                className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2"
              >
                <Users className="w-4 h-4 text-purple-700" /> Travelers
              </label>
              <select
                id="travelers"
                value={travelers}
                onChange={(e) => setTravelers(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                {TRAVELER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Travel Date (optional) */}
            <div className="space-y-2">
              <label
                htmlFor="travelDate"
                className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2"
              >
                <Ticket className="w-4 h-4 text-amber-700" /> Travel Date (optional)
              </label>
              <input
                id="travelDate"
                type="date"
                value={travelDate}
                min={minDate || undefined}
                onChange={(e) => setTravelDate(e.target.value)}
                className="block w-full min-w-0 min-h-12 bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Interests Pills */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Select Your Interests
            </span>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_INTERESTS.map((interest) => {
                const active = selectedInterests.includes(interest);
                return (
                  <button
                    type="button"
                    key={interest}
                    aria-pressed={active}
                    onClick={() => toggleInterest(interest)}
                    className={`px-3.5 py-2 sm:px-3 sm:py-1.5 rounded-full text-xs font-medium transition-all ${
                      active
                        ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                  >
                    {interest}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 sm:gap-4 pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Compass className="w-5 h-5 animate-spin" /> Generating AI Route...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" /> Generate Itinerary
                </>
              )}
            </button>

            {isLoading && (
              <button
                type="button"
                onClick={() => stop()}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-3 rounded-xl transition"
              >
                Stop
              </button>
            )}
          </div>
        </form>

        {/* Streaming progress: shows from the moment "Generate" is pressed until the last day lands */}
        {isLoading && (
          <GenerationProgress
            totalDays={requestedDays ?? days}
            startedDays={startedDays}
            hasStarted={Boolean(itinerary?.tripTitle)}
          />
        )}

        {/* Skeletons for the very first seconds, before any part of the trip has streamed in */}
        {isLoading && !itinerary && (
          <div className="space-y-8">
            {Array.from({ length: requestedDays ?? days }, (_, i) => (
              <DaySkeleton key={i} dayNumber={i + 1} />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm flex items-start gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {rateLimitMessage ?? "We couldn't generate your itinerary. Please try again in a moment."}
            </span>
          </div>
        )}

        {!isLoading && !error && itinerary?.days && requestedDays !== null && plannedDays < requestedDays && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              We could only plan {plannedDays} of your {requestedDays} days. Please
              generate again to get the full trip.
            </span>
          </div>
        )}

        {canShare && itinerary && generatedTrip && (
          <SharePlan
            key={`share-${planVersion}`}
            days={generatedTrip.days}
            pace={generatedTrip.pace}
            travelers={generatedTrip.travelers}
            interests={generatedTrip.interests}
            travelDate={travelDate}
            itinerary={itinerary}
          />
        )}

        {itinerary && (
          <ItineraryResults
            key={`itinerary-${planVersion}`}
            itinerary={itinerary}
            isLoading={isLoading}
            travelDate={travelDate}
            adults={adults}
            servedFromCache={servedFromCache}
            requestedDays={requestedDays}
          />
        )}
      </div>
    </main>
  );
}
