import { ExternalLink, Star, Clock, ShieldCheck, Loader2 } from "lucide-react";
import type { ViatorTour } from "@/lib/tour-types";

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
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
      className={`flex flex-col sm:flex-row gap-3 bg-slate-900 border rounded-lg p-3 ${
        unavailable ? "border-slate-800 opacity-60" : "border-slate-700"
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
        <p className="text-sm font-semibold text-slate-100 line-clamp-2">{tour.title}</p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
          {tour.rating !== null && (
            <span className="inline-flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              {tour.rating.toFixed(1)}
              {tour.reviewCount > 0 && <span>({tour.reviewCount.toLocaleString("en-GB")})</span>}
            </span>
          )}
          {tour.durationText && (
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {tour.durationText}
            </span>
          )}
          {tour.freeCancellation && (
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3 h-3" />
              Free cancellation
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <div className="text-xs">
            {a?.status === "available" && a.totalPriceGBP !== undefined ? (
              <>
                <span className="font-bold text-slate-100 text-sm">
                  £{a.totalPriceGBP.toFixed(2)}
                </span>{" "}
                <span className="text-slate-400">
                  total for {adults} {adults === 1 ? "adult" : "adults"}
                </span>{" "}
                <span className="text-emerald-400 font-semibold">
                  · Available {formatDate(a.travelDate)}
                </span>
              </>
            ) : unavailable ? (
              <span className="text-red-400 font-semibold">
                Not available on {formatDate(a!.travelDate)}
              </span>
            ) : tour.fromPriceGBP !== null ? (
              <>
                <span className="text-slate-400">From </span>
                <span className="font-bold text-slate-100 text-sm">
                  £{tour.fromPriceGBP.toFixed(2)}
                </span>
                <span className="text-slate-400"> per person</span>
                {a?.status === "unknown" && (
                  <span className="text-amber-400"> · availability unconfirmed</span>
                )}
              </>
            ) : null}
          </div>

          <a
            href={tour.bookingUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="inline-flex items-center gap-1.5 py-1.5 text-xs font-bold text-sky-400 hover:text-sky-300"
          >
            View on Viator <ExternalLink className="w-3 h-3" />
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
      <div className="bg-slate-950 border border-purple-500/20 rounded-xl p-4 text-xs text-purple-300 flex items-center gap-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Checking live tours, prices &amp; availability on Viator…
      </div>
    );
  }

  if (!tours || tours.length === 0) return null;

  return (
    <div className="bg-slate-950 border border-purple-500/20 rounded-xl p-3 sm:p-4 space-y-3 mt-2">
      <div className="text-xs text-purple-400 font-semibold uppercase tracking-wider">
        Book tours &amp; tickets · live from Viator
      </div>
      <div className="space-y-2">
        {tours.map((tour) => (
          <TourCard key={tour.productCode} tour={tour} adults={adults} />
        ))}
      </div>
    </div>
  );
}
