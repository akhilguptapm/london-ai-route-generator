"use client";

import { useState } from "react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}
import { Check, Link2, Share2 } from "lucide-react";
import type { ItineraryView } from "@/components/ItineraryResults";
import { formatShareExpiry, PLANNER_BASE_PATH, SHARE_TTL_DAYS } from "@/lib/share-plan";

type ShareResponse = {
  id?: string;
  expiresAt?: string;
  path?: string;
  error?: string;
  message?: string;
};

function trackShare(input: {
  id: string;
  days: number;
  pace: string;
  travelers: string;
  interests: string[];
}) {
  if (typeof window.gtag !== "function") return;
  window.gtag("event", "share", {
    method: "copy_link",
    content_type: "itinerary",
    item_id: input.id,
    trip_days: input.days,
    travel_pace: input.pace,
    travelers: input.travelers,
    interests: input.interests.join(", "),
  });
}

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function SharePlan({
  days,
  pace,
  travelers,
  interests,
  travelDate,
  itinerary,
}: {
  days: number;
  pace: string;
  travelers: string;
  interests: string[];
  travelDate: string;
  itinerary: ItineraryView;
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [url, setUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    if (status === "saving") return;
    if (status === "saved" && url) {
      setCopied(await copyText(url));
      return;
    }

    setStatus("saving");
    setMessage("");
    setCopied(false);

    try {
      const res = await fetch(`${PLANNER_BASE_PATH}/api/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          days,
          pace,
          travelers,
          interests,
          travelDate: travelDate || undefined,
          itinerary,
        }),
      });
      const data = (await res.json().catch(() => null)) as ShareResponse | null;
      if (!res.ok || !data?.id || !data.expiresAt || !data.path) {
        setStatus("error");
        setMessage(data?.message ?? "We couldn't save this plan. Please try again in a moment.");
        return;
      }

      const shareUrl = `${window.location.origin}${data.path}`;
      setUrl(shareUrl);
      setExpiresAt(data.expiresAt);
      setStatus("saved");
      setCopied(await copyText(shareUrl));
      trackShare({ id: data.id, days, pace, travelers, interests });
    } catch {
      setStatus("error");
      setMessage("We couldn't save this plan. Please try again in a moment.");
    }
  }

  const expiryLabel = expiresAt ? formatShareExpiry(expiresAt) : "";

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900">Save and share this itinerary</h2>
          <p className="text-sm text-slate-600 mt-1">
            The link stays available for {SHARE_TTL_DAYS} days. Anyone with it can open this plan.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={status === "saving"}
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-60 text-white font-bold px-4 py-3 rounded-xl transition shrink-0 cursor-pointer"
        >
          {status === "saved" ? <Link2 className="w-4 h-4" aria-hidden="true" /> : <Share2 className="w-4 h-4" aria-hidden="true" />}
          {status === "saving" ? "Saving…" : status === "saved" ? "Copy link" : "Save & share"}
        </button>
      </div>

      {status === "saved" && (
        <div className="space-y-2">
          <label htmlFor="share-link" className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Share link
          </label>
          <input
            id="share-link"
            readOnly
            value={url}
            onFocus={(event) => event.currentTarget.select()}
            className="block w-full max-w-full min-w-0 bg-slate-50 border border-slate-300 rounded-lg p-3 text-base sm:text-sm text-slate-900"
          />
          <p className="text-sm text-slate-600 break-words" role="status">
            {copied && (
              <span className="flex items-center gap-1 font-semibold text-emerald-700 mb-1">
                <Check className="w-4 h-4" aria-hidden="true" /> Link copied.
              </span>
            )}
            <span className="block">
              {expiryLabel ? `This link works until ${expiryLabel}.` : `This link works for ${SHARE_TTL_DAYS} days.`}
            </span>
          </p>
        </div>
      )}

      {status === "error" && (
        <p role="alert" className="text-sm text-red-700">
          {message}
        </p>
      )}
    </section>
  );
}
