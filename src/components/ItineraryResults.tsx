"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TourOptions } from "@/components/TourOptions";
import { TourFallback, hasNoBookableTours, type FallbackPlan } from "@/components/TourFallback";
import { DaySkeleton } from "@/components/DaySkeleton";
import { getGoCityLondonPassLink } from "@/lib/affiliates";
import {
  calculatePassSavings,
  formatSavingsRange,
  matchGoCityAttraction,
  viatorEntryPriceUSD,
} from "@/lib/pass-savings";
import { PLANNER_BASE_PATH } from "@/lib/share-plan";
import type { ToursApiResponse, ViatorTour } from "@/lib/tour-types";
import { Train, ArrowRight, ArrowUp, ChevronDown, Zap, AlertTriangle } from "lucide-react";

export type ItineraryView = {
  tripTitle?: string;
  summary?: string;
  days?: Array<
    | {
        dayNumber?: number;
        theme?: string;
        dayDescription?: string;
        schedule?: Array<
          | {
              timeSlot?: string;
              attractionName?: string;
              description?: string;
              transitTip?: string;
              tourSearchTerm?: string | null;
              fallback?: FallbackPlan | null;
            }
          | undefined
        >;
      }
    | undefined
  >;
};

function scrollToTop() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
}

export function ItineraryResults({
  itinerary,
  isLoading,
  travelDate,
  adults,
  servedFromCache,
  requestedDays,
  showTitle = true,
}: {
  itinerary: ItineraryView;
  isLoading: boolean;
  travelDate: string;
  adults: number;
  servedFromCache: boolean;
  requestedDays: number | null;
  /** The share page already shows the trip title as the page heading. */
  showTitle?: boolean;
}) {
  const [openDays, setOpenDays] = useState<Record<number, boolean>>({});
  const [tourData, setTourData] = useState<Record<string, ViatorTour[]>>({});
  const [toursStatus, setToursStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const fetchKey = useRef<string | null>(null);
  const [altTourData, setAltTourData] = useState<Record<string, ViatorTour[]>>({});
  const altFetchKey = useRef<string | null>(null);

  const hasTourTerms = Boolean(
    itinerary.days?.some((d) => d?.schedule?.some((s) => s?.tourSearchTerm?.trim()))
  );
  const savingsReady =
    !isLoading && Boolean(itinerary.days?.length) && (toursStatus === "done" || toursStatus === "error" || !hasTourTerms);
  const passRec = useMemo(
    () =>
      savingsReady
        ? calculatePassSavings(itinerary.days, (stop) => {
            const term = stop.tourSearchTerm?.trim();
            return term ? viatorEntryPriceUSD(tourData[term], adults) : null;
          })
        : null,
    [savingsReady, itinerary.days, tourData, adults]
  );

  useEffect(() => {
    if (isLoading || !itinerary.days) return;

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
    altFetchKey.current = null;
    setAltTourData({});
    setToursStatus("loading");

    fetch(`${PLANNER_BASE_PATH}/api/tours`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queries: terms, travelDate: travelDate || undefined, adults }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ToursApiResponse>;
      })
      .then((data) => {
        if (fetchKey.current !== key) return;
        setTourData(data.results ?? {});
        setToursStatus(!data.configured || data.failedLookups === terms.length ? "error" : "done");
      })
      .catch(() => {
        if (fetchKey.current === key) setToursStatus("error");
      });
  }, [isLoading, itinerary, travelDate, adults]);

  useEffect(() => {
    if (isLoading || toursStatus !== "done" || !itinerary.days) return;

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

    fetch(`${PLANNER_BASE_PATH}/api/tours`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queries: terms, travelDate: travelDate || undefined, adults }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ToursApiResponse>;
      })
      .then((data) => {
        if (altFetchKey.current !== key) return;
        setAltTourData((prev) => ({ ...prev, ...(data.results ?? {}) }));
      })
      .catch(() => {
        // Non-critical: the suggestion still shows its Maps link without a booking button.
      });
  }, [isLoading, toursStatus, itinerary, tourData, altTourData, travelDate, adults]);

  return (
    <>
      {!isLoading && toursStatus === "error" && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Live tour prices are temporarily unavailable. Your itinerary is still ready to use.</span>
        </div>
      )}

      <div className="space-y-8 animate-fade-in">
        <div className="bg-gradient-to-r from-sky-50 via-white to-indigo-50 border border-sky-200 rounded-2xl p-4 sm:p-6 space-y-3">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div className="min-w-0 flex-1 basis-64">
              {showTitle && (
                <h2 className="text-xl sm:text-2xl font-bold text-sky-700 break-words">{itinerary.tripTitle}</h2>
              )}
              <p className={`text-slate-700 text-sm ${showTitle ? "mt-1" : ""}`}>{itinerary.summary}</p>
              {servedFromCache && !isLoading && (
                <p className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                  <Zap className="w-3.5 h-3.5" /> Loaded instantly from our popular routes
                </p>
              )}
            </div>
          </div>

          {savingsReady && (
            <a
              href={getGoCityLondonPassLink()}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="inline-flex flex-wrap items-center justify-between gap-3 w-full p-4 mt-4 bg-emerald-50 border border-emerald-300 rounded-xl hover:bg-emerald-100 transition-all group cursor-pointer shadow-lg"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="p-2 bg-emerald-100 text-emerald-700 rounded-lg text-xl font-bold shrink-0">$</span>
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

        {itinerary.days?.map((day, dayIdx) => {
          const isOpen = openDays[dayIdx] ?? dayIdx === 0;
          const panelId = `day-panel-${dayIdx}`;
          const hasContent = Boolean(day?.theme?.trim()) && (day?.schedule?.length ?? 0) > 0;
          if (!hasContent) {
            if (!isLoading) return null;
            return <DaySkeleton key={dayIdx} dayNumber={day?.dayNumber ?? dayIdx + 1} />;
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
                    <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </span>
                </button>
                {day?.dayDescription && <p className="text-slate-600 text-sm mt-3">{day.dayDescription}</p>}
              </div>

              {isOpen && (
                <div id={panelId} className="space-y-6 relative border-l-2 border-slate-200 ml-2 pl-5 sm:ml-4 sm:pl-6">
                  {day?.schedule?.map((item, idx) => (
                    <div key={idx} className="relative space-y-3 group min-w-0">
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

                      {item?.transitTip && (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 flex items-start gap-2">
                          <Train className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          <span>{item.transitTip}</span>
                        </div>
                      )}

                      {!isLoading && item?.tourSearchTerm && toursStatus !== "idle" && (
                        <TourOptions
                          tours={tourData[item.tourSearchTerm]}
                          loading={toursStatus === "loading"}
                          adults={adults}
                        />
                      )}

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

        {isLoading &&
          Array.from({ length: Math.max((requestedDays ?? 0) - (itinerary.days?.length ?? 0), 0) }, (_, i) => (
            <DaySkeleton key={`pending-${i}`} dayNumber={(itinerary.days?.length ?? 0) + i + 1} />
          ))}

        {!isLoading && (itinerary.days?.length ?? 0) > 0 && (
          <div className="flex flex-col items-center gap-1.5 pt-2 pb-4">
            <button
              type="button"
              onClick={scrollToTop}
              aria-label="Back to top"
              title="Back to top"
              className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white border border-slate-300 text-slate-700 shadow-md hover:bg-sky-500 hover:border-sky-500 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 transition cursor-pointer"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
            <span className="text-xs font-semibold text-slate-500">Back to top</span>
          </div>
        )}
      </div>
    </>
  );
}
