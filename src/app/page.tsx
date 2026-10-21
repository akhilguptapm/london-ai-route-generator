"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useObject } from "@ai-sdk/react";
import { ItinerarySchema } from "@/lib/schema";
import { TourOptions } from "@/components/TourOptions";
import { TourFallback, hasNoBookableTours } from "@/components/TourFallback";
import { getGoCityLondonPassLink } from "@/lib/affiliates";
import {
  calculatePassSavings,
  formatSavingsRange,
  matchGoCityAttraction,
  viatorEntryPriceUSD,
} from "@/lib/pass-savings";
import type { ToursApiResponse, ViatorTour } from "@/lib/tour-types";
import {
  Compass,
  Clock,
  Train,
  Ticket,
  Sparkles,
  Calendar,
  Users,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
} from "lucide-react";

const AVAILABLE_INTERESTS = [
  "Historical Palaces",
  "Museums",
  "Family Friendly",
  "Food & Markets",
  "Hidden Gems",
  "Parks & Views",
];

// Party size used for live Viator price / availability checks (adult pricing).
const ADULTS_BY_TRAVELERS: Record<string, number> = {
  "Solo Traveler": 1,
  "Couple / 2 Adults": 2,
  "Family with Kids": 4,
  "Group of Friends": 4,
};

export default function Home() {
  const [days, setDays] = useState<number>(3);
  const [pace, setPace] = useState<string>("Balanced");
  const [travelers, setTravelers] = useState<string>("Couple / 2 Adults");
  const [travelDate, setTravelDate] = useState<string>("");
  // Which day cards are expanded, keyed by day index (unset = default: only Day 1 open).
  const [openDays, setOpenDays] = useState<Record<number, boolean>>({});
  // Number of days asked for in the last generation (so the "missing days" notice ignores later form edits).
  const [requestedDays, setRequestedDays] = useState<number | null>(null);
  // Set on the client after mount (can't read the current time during prerender)
  const [minDate, setMinDate] = useState<string>("");
  useEffect(() => {
    setMinDate(new Date().toISOString().slice(0, 10));
  }, []);
  const [tourData, setTourData] = useState<Record<string, ViatorTour[]>>({});
  const [toursStatus, setToursStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const fetchKey = useRef<string | null>(null);
  const [altTourData, setAltTourData] = useState<Record<string, ViatorTour[]>>({});
  const altFetchKey = useRef<string | null>(null);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([
    "Historical Palaces",
    "Museums",
    "Food & Markets",
  ]);

  const {
    object: itinerary,
    submit,
    isLoading,
    stop,
    error,
  } = useObject({
    api: "/api/generate",
    schema: ItinerarySchema,
  });

  const adults = ADULTS_BY_TRAVELERS[travelers] ?? 2;

  // Days that actually came back with a theme and stops (the stream can end with an empty trailing day).
  const plannedDays = (itinerary?.days ?? []).filter((d) => d?.theme?.trim() && d?.schedule?.length).length;

  // Pass savings are calculated (not AI-written): Go City's published USD gate prices, cross-checked against
  // live Viator entry-ticket prices where Viator sells the same attraction. Shown as an estimated range.
  const hasTourTerms = Boolean(
    itinerary?.days?.some((d) => d?.schedule?.some((s) => s?.tourSearchTerm?.trim()))
  );
  const savingsReady =
    !isLoading && Boolean(itinerary?.days?.length) && (toursStatus === "done" || toursStatus === "error" || !hasTourTerms);
  const passRec = useMemo(
    () =>
      savingsReady
        ? calculatePassSavings(itinerary?.days, (stop) => {
            const term = stop.tourSearchTerm?.trim();
            return term ? viatorEntryPriceUSD(tourData[term], adults) : null;
          })
        : null,
    [savingsReady, itinerary?.days, tourData, adults]
  );

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  // Live Viator tours for every bookable attraction, fetched once the itinerary is complete.
  // Re-runs if the travel date / party size changes so prices & availability stay current.
  useEffect(() => {
    if (isLoading || !itinerary?.days) return;

    const terms = Array.from(
      new Set(
        itinerary.days
          .flatMap((d) => d?.schedule ?? [])
          .map((s) => s?.tourSearchTerm?.trim())
          .filter((t): t is string => Boolean(t))
      )
    );
    if (terms.length === 0) return;

    const key = JSON.stringify([terms, travelDate, adults]);
    if (fetchKey.current === key) return;
    fetchKey.current = key;
    altFetchKey.current = null; // date / party changed, so nearby-alternative tours are stale too
    setAltTourData({});
    setToursStatus("loading");

    fetch("/api/tours", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queries: terms, travelDate: travelDate || undefined, adults }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ToursApiResponse>;
      })
      .then((data) => {
        if (fetchKey.current !== key) return; // a newer request superseded this one
        setTourData(data.results ?? {});
        setToursStatus(
          !data.configured || data.failedLookups === terms.length ? "error" : "done"
        );
      })
      .catch(() => {
        if (fetchKey.current === key) setToursStatus("error");
      });
  }, [isLoading, itinerary, travelDate, adults]);

  // For stops with no bookable tours, the "nearby alternative" may itself be a ticketed sight
  // (e.g. Houses of Parliament). Look those up so the suggestion can link straight to booking.
  useEffect(() => {
    if (isLoading || toursStatus !== "done" || !itinerary?.days) return;

    const terms = Array.from(
      new Set(
        itinerary.days
          .flatMap((d) => d?.schedule ?? [])
          .filter((s) => s?.tourSearchTerm && hasNoBookableTours(tourData[s.tourSearchTerm.trim()]))
          .map((s) => s?.fallback?.nearbyAlternative?.tourSearchTerm?.trim())
          .filter((t): t is string => Boolean(t))
          .filter((t) => !(t in tourData) && !(t in altTourData))
      )
    );
    if (terms.length === 0) return;

    const key = JSON.stringify([terms, travelDate, adults]);
    if (altFetchKey.current === key) return;
    altFetchKey.current = key;

    fetch("/api/tours", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queries: terms, travelDate: travelDate || undefined, adults }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ToursApiResponse>;
      })
      .then((data) => {
        if (altFetchKey.current !== key) return; // superseded by a new date / itinerary
        setAltTourData((prev) => ({ ...prev, ...(data.results ?? {}) }));
      })
      .catch(() => {
        // Non-critical: the suggestion still shows its Maps link without a booking button.
      });
  }, [isLoading, toursStatus, itinerary, tourData, altTourData, travelDate, adults]);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    fetchKey.current = null;
    altFetchKey.current = null;
    setAltTourData({});
    setTourData({});
    setOpenDays({});
    setRequestedDays(days);
    setToursStatus("idle");
    submit({
      days,
      pace,
      travelers,
      interests: selectedInterests,
    });
  };

  return (
    <main className="min-h-dvh bg-white text-slate-900 px-3 py-4 sm:p-6 md:p-8 font-sans">
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
                <option value="Relaxed">Relaxed (2 sights/day)</option>
                <option value="Balanced">Balanced (3 sights/day)</option>
                <option value="Fast-Paced">Fast-Paced (4+ sights/day)</option>
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
                <option value="Solo Traveler">Solo Traveler</option>
                <option value="Couple / 2 Adults">Couple / 2 Adults</option>
                <option value="Family with Kids">Family with Kids</option>
                <option value="Group of Friends">Group of Friends</option>
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

        {/* Error State */}
        {error && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm flex items-start gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              We couldn&apos;t generate your itinerary. Please try again in a moment.
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

        {!isLoading && toursStatus === "error" && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Live tour prices are temporarily unavailable. Your itinerary is still ready to use.</span>
          </div>
        )}

        {/* Results Container */}
        {itinerary && (
          <div className="space-y-8 animate-fade-in">
            {/* Overview Header Card */}
            <div className="bg-gradient-to-r from-sky-50 via-white to-indigo-50 border border-sky-200 rounded-2xl p-4 sm:p-6 space-y-3">
              <div className="flex flex-wrap justify-between items-start gap-4">
                <div className="min-w-0 flex-1 basis-64">
                  <h2 className="text-xl sm:text-2xl font-bold text-sky-700 break-words">{itinerary.tripTitle}</h2>
                  <p className="text-slate-700 text-sm mt-1">{itinerary.summary}</p>
                </div>
              </div>

              {/* Interactive London Pass Savings Banner (only once the itinerary is complete) */}
              {savingsReady && (
                <a
                  href={getGoCityLondonPassLink()}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="inline-flex flex-wrap items-center justify-between gap-3 w-full p-4 mt-4 bg-emerald-50 border border-emerald-300 rounded-xl hover:bg-emerald-100 transition-all group cursor-pointer shadow-lg"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="p-2 bg-emerald-100 text-emerald-700 rounded-lg text-xl font-bold shrink-0">
                      $
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-wider text-emerald-700 font-semibold">
                        Exclusive Pass Savings
                      </div>
                      {passRec && passRec.savingsLowUSD >= 1 ? (
                        <>
                          <div className="text-base sm:text-lg font-bold text-slate-900">
                            Unlock {formatSavingsRange(passRec)} Sightseeing Pass Savings — Get Yours Today
                          </div>
                          <div className="text-xs text-emerald-800 mt-0.5">
                            Estimated Pass Savings: {formatSavingsRange(passRec)} per person (based on{" "}
                            {passRec.liveRatesUsed > 0
                              ? "live individual gate entry rates"
                              : "current individual gate entry rates"}
                            )
                          </div>
                          <div className="text-xs text-emerald-700/80 mt-0.5">
                            {passRec.passLabel} (${passRec.passPriceUSD}) covers {passRec.coveredCount} attraction
                            {passRec.coveredCount === 1 ? "" : "s"} worth about ${passRec.gateTotalLowUSD.toLocaleString("en-US")}
                            {passRec.gateTotalHighUSD > passRec.gateTotalLowUSD
                              ? `–$${passRec.gateTotalHighUSD.toLocaleString("en-US")}`
                              : ""}{" "}
                            at the gate. Estimates only; prices can change.
                          </div>
                        </>
                      ) : passRec ? (
                        <>
                          <div className="text-base sm:text-lg font-bold text-slate-900">
                            Add more sights to unlock Go City pass savings — Get Yours Today
                          </div>
                          <div className="text-xs text-emerald-800 mt-0.5">
                            This plan has {passRec.coveredCount} pass-covered attraction
                            {passRec.coveredCount === 1 ? "" : "s"} worth about $
                            {passRec.gateTotalLowUSD.toLocaleString("en-US")} per person at the gate, versus $
                            {passRec.passPriceUSD} for the {passRec.passLabel}
                            {passRec.gateTotalHighUSD >= passRec.passPriceUSD - 15
                              ? " — roughly break-even."
                              : " — the pass would cost more than paying at the gate."}{" "}
                            Passes start saving with more paid attractions per day.
                          </div>
                        </>
                      ) : (
                        <div className="text-base sm:text-lg font-bold text-slate-900">
                          Compare Go City London Pass options — Get Yours Today
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-lg text-sm transition-all group-hover:translate-x-1">
                    Book &amp; Save Now
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </a>
              )}
            </div>

            {/* Days Loop */}
            {itinerary.days?.map((day, dayIdx) => {
              // Day 1 starts open; the rest start collapsed until the user expands them.
              const isOpen = openDays[dayIdx] ?? dayIdx === 0;
              const panelId = `day-panel-${dayIdx}`;

              // A day streams in piece by piece. Until it has a theme and at least one stop it is
              // empty: show a placeholder while the AI is still writing, and hide it if it never filled in.
              const hasContent = Boolean(day?.theme?.trim()) && (day?.schedule?.length ?? 0) > 0;
              if (!hasContent) {
                if (!isLoading) return null;
                return (
                  <div
                    key={dayIdx}
                    className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 flex items-center gap-3"
                  >
                    <div className="bg-sky-500 text-white h-8 px-3 rounded-lg flex items-center justify-center font-bold text-sm whitespace-nowrap shrink-0">
                      Day {day?.dayNumber ?? dayIdx + 1}
                    </div>
                    <span className="text-sm text-slate-600 flex items-center gap-2">
                      <Compass className="w-4 h-4 animate-spin" /> Planning this day…
                    </span>
                  </div>
                );
              }

              return (
              <div
                key={dayIdx}
                className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-5 sm:space-y-6"
              >
                <div className={isOpen ? "border-b border-slate-200 pb-4" : ""}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenDays((prev) => ({ ...prev, [dayIdx]: !isOpen }))}
                    className="w-full flex items-center gap-3 text-left cursor-pointer"
                  >
                    <div className="bg-sky-500 text-white h-8 px-3 rounded-lg flex items-center justify-center font-bold text-sm whitespace-nowrap shrink-0">
                      Day {day?.dayNumber ?? dayIdx + 1}
                    </div>
                    <h3 className="min-w-0 flex-1 text-lg sm:text-xl font-bold text-slate-900 break-words">{day?.theme}</h3>
                    <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-sky-700 shrink-0">
                      <span>{isOpen ? "Collapse" : `Expand Day ${day?.dayNumber ?? dayIdx + 1}`}</span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </span>
                  </button>
                  {day?.dayDescription && (
                    <p className="text-slate-600 text-sm mt-3">{day.dayDescription}</p>
                  )}
                </div>

                {/* Schedule Timeline */}
                {isOpen && (
                <div
                  id={panelId}
                  className="space-y-6 relative border-l-2 border-slate-200 ml-2 pl-5 sm:ml-4 sm:pl-6"
                >
                  {day?.schedule?.map((item, idx) => (
                    <div key={idx} className="relative space-y-3 group min-w-0">
                      {/* Timeline Indicator Node */}
                      <span className="absolute -left-[29px] sm:-left-[33px] top-1 w-4 h-4 rounded-full bg-white border-2 border-sky-400 group-hover:bg-sky-400 transition" />

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-200">
                          {item?.timeSlot}
                        </span>
                        {!isLoading && matchGoCityAttraction(item?.attractionName) && (
                          <a
                            href={getGoCityLondonPassLink()}
                            target="_blank"
                            rel="noopener noreferrer sponsored"
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-300 hover:border-emerald-500 text-emerald-700 rounded-full text-xs font-semibold transition-all hover:bg-emerald-100"
                          >
                            <span>✓ Included with London Pass</span>
                            <span className="font-extrabold underline underline-offset-2">Book Pass</span>
                          </a>
                        )}
                      </div>

                      <h4 className="text-base sm:text-lg font-bold text-slate-900 break-words">{item?.attractionName}</h4>
                      <p className="text-slate-600 text-sm">{item?.description}</p>

                      {/* Transit Instructions */}
                      {item?.transitTip && (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 flex items-start gap-2">
                          <Train className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          <span>{item.transitTip}</span>
                        </div>
                      )}

                      {/* Live tours from Viator (looked up after the itinerary finishes streaming) */}
                      {!isLoading && item?.tourSearchTerm && toursStatus !== "idle" && (
                        <TourOptions
                          tours={tourData[item.tourSearchTerm]}
                          loading={toursStatus === "loading"}
                          adults={adults}
                        />
                      )}

                      {/* Alternate route suggestion when nothing can be booked for the selected date */}
                      {!isLoading &&
                        item?.tourSearchTerm &&
                        item.fallback &&
                        toursStatus === "done" &&
                        hasNoBookableTours(tourData[item.tourSearchTerm]) && (
                          <TourFallback
                            attractionName={item.attractionName ?? item.tourSearchTerm}
                            timeSlot={item.timeSlot}
                            fallback={item.fallback}
                            tours={tourData[item.tourSearchTerm]}
                            alternativeTours={
                              item.fallback.nearbyAlternative?.tourSearchTerm
                                ? tourData[item.fallback.nearbyAlternative.tourSearchTerm.trim()] ??
                                  altTourData[item.fallback.nearbyAlternative.tourSearchTerm.trim()]
                                : undefined
                            }
                            isLondonPassIncluded={Boolean(matchGoCityAttraction(item.attractionName))}
                          />
                        )}
                    </div>
                  ))}
                </div>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
