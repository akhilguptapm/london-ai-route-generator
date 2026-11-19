// Client-safe constants for saved itinerary links. Persistence lives in saved-plans.ts.

/** Must match `basePath` in next.config.ts. Plain fetch() calls are not prefixed automatically. */
export const PLANNER_BASE_PATH = "/planner";

/** How long a shared link keeps working after it is created. */
export const SHARE_TTL_DAYS = 90;
export const SHARE_TTL_SECONDS = SHARE_TTL_DAYS * 24 * 60 * 60;

const SHARE_ID_PATTERN = /^[A-Za-z0-9_-]{16}$/;

export function isShareId(id: string): boolean {
  return SHARE_ID_PATTERN.test(id);
}

export function sharePath(id: string): string {
  return `${PLANNER_BASE_PATH}/s/${id}`;
}

/** Calendar date in UTC, so the expiry shown matches the server timer. */
export function formatShareExpiry(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
