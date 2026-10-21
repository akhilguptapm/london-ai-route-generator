/**
 * Affiliate link helpers.
 *
 * Go City is the official London Pass partner; links are generated in Travelpayouts.
 * Override the default shortlink without a code change by setting
 * NEXT_PUBLIC_GOCITY_AFFILIATE_LINK (e.g. in Vercel env vars).
 */
export const GOCITY_PRIMARY_AFFILIATE_LINK = "https://gocity.tpk.lu/Tuy6ILxc";

/**
 * Returns the Go City affiliate link for London Passes.
 * Falls back to the primary Travelpayouts shortlink.
 */
export function getGoCityLondonPassLink(): string {
  return process.env.NEXT_PUBLIC_GOCITY_AFFILIATE_LINK?.trim() || GOCITY_PRIMARY_AFFILIATE_LINK;
}
