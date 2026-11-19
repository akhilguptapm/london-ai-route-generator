import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { ItineraryResults } from "@/components/ItineraryResults";
import { NewPlanLink } from "@/components/NewPlanLink";
import { getSavedPlan } from "@/lib/saved-plans";
import { formatShareExpiry, isShareId, SHARE_TTL_DAYS } from "@/lib/share-plan";
import { adultsForTravelers } from "@/lib/trip-options";

export const metadata: Metadata = {
  title: "Shared London itinerary | London Tour Package",
  description: "A saved London itinerary from the London Tour Package planner.",
  robots: { index: false, follow: true },
  alternates: { canonical: "https://londontourpackage.com/planner" },
};

function ExpiredPlan() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          This plan is no longer available
        </h1>
        <p className="text-slate-600 text-sm sm:text-base max-w-2xl">
          Shared plans are kept for {SHARE_TTL_DAYS} days. This link has expired, or it is not a valid plan link.
        </p>
      </header>
      <NewPlanLink />
    </div>
  );
}

async function SharedPlan({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const plan = isShareId(id) ? await getSavedPlan(id) : null;
  if (!plan) return <ExpiredPlan />;

  const expiryLabel = formatShareExpiry(plan.expiresAt);

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-sky-700">Shared London itinerary</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 break-words">
            {plan.itinerary.tripTitle}
          </h1>
          <p className="text-sm text-slate-600">
            {expiryLabel
              ? `This link works until ${expiryLabel}.`
              : `This link works for ${SHARE_TTL_DAYS} days.`}
          </p>
        </div>
        <NewPlanLink />
      </header>

      <ItineraryResults
        itinerary={plan.itinerary}
        isLoading={false}
        travelDate={plan.trip.travelDate ?? ""}
        adults={adultsForTravelers(plan.trip.travelers)}
        servedFromCache={false}
        requestedDays={plan.trip.days}
        showTitle={false}
      />

      <NewPlanLink />
    </div>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="flex-1 bg-white text-slate-900 px-3 py-4 sm:p-6 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <Suspense
          fallback={<p className="text-slate-600 text-sm py-8">Loading this plan…</p>}
        >
          <SharedPlan params={params} />
        </Suspense>
      </div>
    </main>
  );
}
