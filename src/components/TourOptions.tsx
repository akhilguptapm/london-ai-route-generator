import { ExternalLink, Star, Clock, ShieldCheck, Loader2 } from "lucide-react";
import type { ViatorTour } from "@/lib/tour-types";

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function TourCard({ tour, adults }: { tour: ViatorTour; adults: number }) {
  const a = tour.availability;
  const unavailable = a?.status === "unavailable";

  return (
    <div
      className={`flex flex-col sm:flex-row gap-3 bg-white border rounded-lg p-3 ${
        unavailable ? "border-slate-200 opacity-60" : "border-slate-300"
      }`}
    >
      {tour.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={tour.imageUrl}
          alt=""
          loading="lazy"
          className="w-full h-36 sm:w-24 sm:h-24 rounded-md object-cover shrink-0"
        />
      )}

      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="text-sm font-semibold text-slate-900 line-clamp-2">{tour.title}</p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
          {tour.rating !== null && (
            <span className="inline-flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              {tour.rating.toFixed(1)}
              {tour.reviewCount > 0 && <span>({tour.reviewCount.toLocaleString("en-US")})</span>}
            </span>
          )}
          {tour.durationText && (
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {tour.durationText}
            </span>
          )}
          {tour.freeCancellation && (
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <ShieldCheck className="w-3 h-3" />
              Free cancellation
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <div className="text-xs">
            {a?.status === "available" && a.totalPriceUSD !== undefined ? (
              <>
                <span className="font-bold text-slate-900 text-sm">
                  ${a.totalPriceUSD.toFixed(2)}
                </span>{" "}
                <span className="text-slate-600">
                  total for {adults} {adults === 1 ? "adult" : "adults"}
                </span>{" "}
                <span className="text-emerald-700 font-semibold">
                  · Available {formatDate(a.travelDate)}
                </span>
              </>
            ) : unavailable ? (
              <span className="text-red-600 font-semibold">
                Not available on {formatDate(a!.travelDate)}
              </span>
            ) : tour.fromPriceUSD !== null ? (
              <>
                <span className="text-slate-600">From </span>
                <span className="font-bold text-slate-900 text-sm">
                  ${tour.fromPriceUSD.toFixed(2)}
                </span>
                <span className="text-slate-600"> per person</span>
                {a?.status === "unknown" && (
                  <span className="text-amber-700"> · availability unconfirmed</span>
                )}
              </>
            ) : null}
          </div>

          <a
            href={tour.bookingUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="inline-flex items-center gap-1.5 py-1.5 text-xs font-bold text-sky-700 hover:text-sky-600"
          >
            {unavailable ? "Check Other Dates" : "Book & Save Now"}{" "}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

export function TourOptions({
  tours,
  loading,
  adults,
}: {
  tours: ViatorTour[] | undefined;
  loading: boolean;
  adults: number;
}) {
  if (loading) {
    return (
      <div className="bg-slate-50 border border-purple-200 rounded-xl p-4 text-xs text-purple-700 flex items-center gap-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Checking live tours, prices &amp; availability on Viator…
      </div>
    );
  }

  if (!tours || tours.length === 0) return null;

  return (
    <div className="bg-slate-50 border border-purple-200 rounded-xl p-3 sm:p-4 space-y-3 mt-2">
      <div className="text-xs text-purple-700 font-semibold uppercase tracking-wider">
        Recommended Top Experiences &amp; Tours
      </div>
      <div className="space-y-2">
        {tours.map((tour) => (
          <TourCard key={tour.productCode} tour={tour} adults={adults} />
        ))}
      </div>
    </div>
  );
}
