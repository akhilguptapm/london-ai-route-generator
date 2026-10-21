"use client";

import { useEffect, useRef, useState } from "react";
import { useObject } from "@ai-sdk/react";
import { ItinerarySchema } from "@/lib/schema";
import { TourOptions } from "@/components/TourOptions";
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
  // Set on the client after mount (can't read the current time during prerender)
  const [minDate, setMinDate] = useState<string>("");
  useEffect(() => {
    setMinDate(new Date().toISOString().slice(0, 10));
  }, []);
  const [tourData, setTourData] = useState<Record<string, ViatorTour[]>>({});
  const [toursStatus, setToursStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const fetchKey = useRef<string | null>(null);
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

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    fetchKey.current = null;
    setTourData({});
    setToursStatus("idle");
    submit({
      days,
      pace,
      travelers,
      interests: selectedInterests,
    });
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header Section */}
        <header className="text-center space-y-3 py-6 border-b border-slate-800">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full text-sm font-semibold border border-amber-500/20">
            <Sparkles className="w-4 h-4" /> AI Route & Itinerary Generator
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">
            London Interactive AI Itinerary Planner
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm md:text-base">
            Build custom day-by-day travel routes optimized by geographic clusters, tube transfers, live ticket availability, and London Pass savings.
          </p>
        </header>

        {/* Form Controls */}
        <form
          onSubmit={handleGenerate}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Days Counter */}
            <div className="space-y-2">
              <label
                htmlFor="days"
                className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2"
              >
                <Calendar className="w-4 h-4 text-sky-400" /> Trip Duration
              </label>
              <select
                id="days"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
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
                className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2"
              >
                <Clock className="w-4 h-4 text-emerald-400" /> Travel Pace
              </label>
              <select
                id="pace"
                value={pace}
                onChange={(e) => setPace(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2"
              >
                <Users className="w-4 h-4 text-purple-400" /> Travelers
              </label>
              <select
                id="travelers"
                value={travelers}
                onChange={(e) => setTravelers(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
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
                className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2"
              >
                <Ticket className="w-4 h-4 text-amber-400" /> Travel Date (optional)
              </label>
              <input
                id="travelDate"
                type="date"
                value={travelDate}
                min={minDate || undefined}
                onChange={(e) => setTravelDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Interests Pills */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
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
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      active
                        ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                    }`}
                  >
                    {interest}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 pt-2">
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
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-4 py-3 rounded-xl transition"
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
            className="bg-red-950/50 border border-red-500/30 text-red-300 rounded-xl p-4 text-sm flex items-start gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              We couldn&apos;t generate your itinerary. Please try again in a moment.
            </span>
          </div>
        )}

        {!isLoading && toursStatus === "error" && (
          <div className="bg-amber-950/40 border border-amber-500/30 text-amber-300 rounded-xl p-4 text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Live tour prices are temporarily unavailable. Your itinerary is still ready to use.</span>
          </div>
        )}

        {!isLoading && toursStatus === "done" && (
          <p className="text-xs text-slate-500 text-center">
            Tour prices and availability are fetched live from Viator. We may earn a commission if you book,
            at no extra cost to you.
          </p>
        )}

        {/* Results Container */}
        {itinerary && (
          <div className="space-y-8 animate-fade-in">
            {/* Overview Header Card */}
            <div className="bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 border border-sky-500/30 rounded-2xl p-6 space-y-3">
              <div className="flex flex-wrap justify-between items-start gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-sky-400">{itinerary.tripTitle}</h2>
                  <p className="text-slate-300 text-sm mt-1">{itinerary.summary}</p>
                </div>
                {itinerary.estimatedPassSavings && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-xl text-center">
                    <span className="text-xs block uppercase font-bold text-emerald-500">
                      London Pass Savings
                    </span>
                    <span className="text-lg font-extrabold">{itinerary.estimatedPassSavings}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Days Loop */}
            {itinerary.days?.map((day, dayIdx) => (
              <div
                key={dayIdx}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6"
              >
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                  <div className="bg-sky-500 text-white h-8 px-3 rounded-lg flex items-center justify-center font-bold text-sm whitespace-nowrap">
                    Day {day?.dayNumber ?? dayIdx + 1}
                  </div>
                  <h3 className="text-xl font-bold text-white">{day?.theme}</h3>
                </div>

                {/* Schedule Timeline */}
                <div className="space-y-6 relative border-l-2 border-slate-800 ml-4 pl-6">
                  {day?.schedule?.map((item, idx) => (
                    <div key={idx} className="relative space-y-3 group">
                      {/* Timeline Indicator Node */}
                      <span className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-slate-900 border-2 border-sky-400 group-hover:bg-sky-400 transition" />

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-sky-400 bg-sky-950 px-2.5 py-1 rounded-md border border-sky-800">
                          {item?.timeSlot}
                        </span>
                        {item?.isLondonPassIncluded && (
                          <span className="text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800 px-2.5 py-1 rounded-md flex items-center gap-1">
                            <Ticket className="w-3 h-3" /> Included with London Pass
                          </span>
                        )}
                      </div>

                      <h4 className="text-lg font-bold text-slate-100">{item?.attractionName}</h4>
                      <p className="text-slate-400 text-sm">{item?.description}</p>

                      {/* Transit Instructions */}
                      {item?.transitTip && (
                        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 text-xs text-slate-400 flex items-start gap-2">
                          <Train className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
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
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
