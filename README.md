# London AI Route Generator

An AI-powered London itinerary planner for [London Tour Package](https://londontourpackage.com).
Visitors choose how many days they have, their pace, who they are travelling with and what they are interested in.
The app streams back a day-by-day route with tube transit tips, then adds live tour ticket prices and London Pass savings.

**Live:** <https://londontourpackage.com/planner>

## Features

- **AI itineraries, streamed live.** Each day is planned in parallel and appears as soon as it is ready.
- **Live tour options.** Bookable tours and prices come from the Viator Partner API.
- **London Pass savings.** Compares walk-up prices with Go City passes and shows the potential saving.
- **Itinerary cache.** Repeat searches load instantly and cost no AI tokens (Upstash Redis, 24 hours).
- **Abuse protection.** Rate limiting, a shared-secret check between Cloudflare and the app, and spend limits (see Security).
- **Matches the main site.** Same logo, menu, favicon and footer as londontourpackage.com (see Site header and footer).
- **Back to top.** A round arrow button appears after the last day of the itinerary.

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router, Cache Components) with React 19 and TypeScript
- [Vercel AI SDK](https://ai-sdk.dev) with OpenAI (`gpt-4o`) for itinerary generation
- Tailwind CSS 4 and `lucide-react` icons (social brand icons come from [Simple Icons](https://simpleicons.org), CC0)
- Upstash Redis for caching and rate limiting
- Viator Partner API for tours and prices
- Hosted on Vercel, served through Cloudflare

## Getting started

Requirements: Node.js 20 or later.

```bash
npm install
# create .env.local with the variables listed below (or run `vercel env pull .env.local`)
npm run dev
```

The dev server runs on port 3001. Because the app uses a base path (see below), open
<http://localhost:3001/planner>, not the bare `localhost:3001`.
Menu and footer links always point to the live londontourpackage.com, even in local dev.

### Environment variables

Set these in `.env.local` for local development and in the Vercel project settings for production.
Never commit real values.

| Variable | Required | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | Yes | Itinerary generation. |
| `VIATOR_API_KEY` | For live tours | Viator Partner API key. Without it, tour lookups are skipped. |
| `VIATOR_API_BASE_URL` | No | Overrides the default `https://api.viator.com`. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | In production | Cache and rate limiting. The `KV_REST_API_URL` and `KV_REST_API_TOKEN` names also work. |
| `NEXT_PUBLIC_GOCITY_AFFILIATE_LINK` | No | Overrides the default Go City affiliate link. |
| `PLANNER_PROXY_SECRET` | In production | Shared secret with the Cloudflare Worker (see Security). Leave unset locally, otherwise local requests are rejected with `403`. |

Scripts: `npm run dev`, `npm run build`, `npm run start`, `npm run lint`, `npm run pregenerate`.

## Serving the app at `/planner`

The app lives at `londontourpackage.com/planner`, while the main site runs on WordPress. How it fits together:

```
Visitor -> Cloudflare (londontourpackage.com)
             |-- /planner*  -> Cloudflare Worker -> Vercel app (london-ai-route-generator.vercel.app/planner)
             `-- everything else -> WordPress (GoDaddy hosting)
```

- **`basePath: "/planner"`** is set in `next.config.ts`. Every page, asset and API route lives under `/planner`.
- **Plain `fetch()` calls are not prefixed automatically.** `src/app/page.tsx` has a `BASE_PATH` constant that must
  match `basePath` in `next.config.ts`. If you add a new client-side API call, build the URL with `BASE_PATH`.
- **Static files need care too.** `next/image` with `unoptimized` does not add the base path to a string `src`, so
  images are imported (see `src/assets/logo.png`) rather than referenced as `"/logo.png"`.
- **Vercel root redirect.** `next.config.ts` redirects `/` to `/planner`, so the bare `*.vercel.app` address still opens the app.
- **Cloudflare Worker** (`london-ai-planner-proxy`, route `londontourpackage.com/planner*`) forwards `/planner` requests to
  the Vercel app, adding the shared-secret and visitor-IP headers described under Security. It redirects look-alike paths such as `/plannerfoo`
  or `/planner.html` to `/planner`, and rewrites any Vercel redirect so visitors stay on `londontourpackage.com`.
  A copy of its code is in [`cloudflare/worker.js`](cloudflare/worker.js). It is **not** deployed from this repository:
  edit it in the Cloudflare dashboard and keep the copy in sync.
- **Cloudflare Redirect Rule** ("Planner typo redirects") sends common typos such as `/plannr`, `/planer`,
  `/planner-tool`, `/route-planner` and `/itinerary` to `/planner` (302). Add paths there, and first check that none is a real WordPress page.
  Upper-case variants such as `/Planner` are not covered, because Cloudflare route patterns are case-sensitive and the Worker never
  sees them; add them to this rule if wanted.
- Do not add `londontourpackage.com` as a domain in the Vercel project. Cloudflare does the routing.

## Site header and footer

`src/components/SiteHeader.tsx` and `src/components/SiteFooter.tsx` copy the header and footer of londontourpackage.com
so the planner feels like part of the site. They are rendered by `src/app/layout.tsx`.

- **Header:** logo (`src/assets/logo.png`), tagline, and the six main-menu links (`PLANNER_LINK` plus `NAV_LINKS`), with a hamburger menu on phones.
  "AI Route Planner" comes first and is styled as the active item (navy pill on desktop). Its NEW badge hides itself from
  21 Feb 2027 (`NEW_BADGE_UNTIL`), the same date as the WPCode snippet on WordPress, so change both together.
- **Footer:** three link columns (`FOOTER_COLUMNS`), social icons (`SOCIAL_LINKS`, shapes in `src/components/social-icon-paths.ts`),
  an email link, and a copyright line.
- All links are absolute URLs to the live main site. When pages are added, renamed or removed in WordPress, update the lists
  in these two files by hand: they are not read from WordPress.
- **Copyright year:** `COPYRIGHT_YEAR` in `SiteFooter.tsx` is typed in on purpose (reading the date in a server component conflicts
  with Cache Components). Update it each January.
- **Favicon:** `src/app/icon.png` (the round Union Jack flag, same as the main site).

## Security

- **Only the Worker may call the APIs.** The Worker adds `x-planner-proxy-secret` (a shared secret) and
  `x-planner-client-ip` (the visitor's real IP) to every request it forwards. When `PLANNER_PROXY_SECRET` is set
  in Vercel, `/planner/api/generate` and `/planner/api/tours` return `403` for any request without the correct
  secret, so calling the `*.vercel.app` address directly cannot skip Cloudflare or burn OpenAI credits.
  The logic is in `src/lib/proxy-guard.ts`. With the variable unset (local dev) nothing is enforced.
  The pages themselves stay reachable on `*.vercel.app`; only the APIs are protected.
- **Rate limiting uses the real visitor IP.** Behind Cloudflare, Vercel only sees Cloudflare's IPs, so
  `getClientId` in `src/lib/rate-limit.ts` reads `x-planner-client-ip`, but only when the secret is valid.
- **Cloudflare rate-limiting rule** ("Planner API burst limit"): blocks an IP that sends more than 10 requests in
  10 seconds to `/planner/api/*` (429 for 10 seconds). It runs before the Worker and the app. The free Cloudflare plan allows
  one such rule with a fixed 10-second window.
- **Rotating the secret:** generate a new value (`openssl rand -hex 32`), update the Cloudflare Worker secret first
  and then the Vercel env var (then redeploy). Briefly, requests can be rejected between the two steps.
  The value is stored only in Cloudflare and Vercel; keep a copy in a password manager.
- **Security headers** (`nosniff`, `Referrer-Policy`, `X-Frame-Options: SAMEORIGIN`, `Permissions-Policy`) are set in
  `next.config.ts`, and `X-Powered-By` is removed. There is no Content-Security-Policy yet.
- **Spending limits:** the OpenAI project has a monthly spend limit with email alerts. OpenAI treats this as a soft limit
  (it alerts but does not stop requests), so check the usage page now and then.
- **Dependencies:** enabling Dependabot alerts and security updates in the GitHub repository settings is recommended.
  Review any Dependabot PR using its Vercel preview before merging, because every merge to `main` deploys to production.
- Secrets live only in `.env.local` (git-ignored) and in the Vercel and Cloudflare dashboards.

## Itinerary cache (Upstash Redis)

Generated itineraries are cached (24 hours) so repeat searches load instantly and cost no OpenAI tokens.
The cache key is built from the normalised request (days, pace, travelers, interests, start location) plus the model
and `CACHE_VERSION` in `src/lib/itinerary-cache.ts` - **bump `CACHE_VERSION` whenever you change the prompts or schema**.

- **Production:** add Upstash Redis from the Vercel Marketplace (`vercel integration add upstash`), then
  `vercel env pull .env.local`. It injects `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (or the `KV_REST_API_*` equivalents).
- **Local dev:** with no Redis env vars the app falls back to an in-memory cache, so nothing needs configuring.
- Responses carry an `X-Cache: HIT | MISS` header.

Warm the cache with the most common searches (edit `PRESETS` in `scripts/pregenerate.mjs`):

```bash
npm run pregenerate                                # local dev server (http://localhost:3001)
npm run pregenerate -- https://londontourpackage.com # production (the script adds /planner itself)
npm run pregenerate -- --only "3 days"             # only presets whose name contains this text
```

For production, use the public `https://londontourpackage.com` address, not `*.vercel.app`: the request must go through the
Cloudflare Worker, which adds the shared secret. A direct `*.vercel.app` call is rejected with `403`.

## Rate limiting

`/planner/api/generate` limits **uncached** generations to 6 per 10 minutes per client IP (sliding window, `@upstash/ratelimit`,
configured in `src/lib/rate-limit.ts`). Cache hits are never limited since they cost nothing. Over the limit the API returns
`429` with a `Retry-After` header and the UI shows a friendly message. It uses the same Redis as the cache; with no Redis
configured (local dev) limiting is skipped, and if Redis errors the request is allowed through.

`/planner/api/tours` has no limiter of its own in the app; it relies on the Cloudflare rule above.

## Keeping data up to date

- **Go City pass prices** are stored in `src/lib/gocity-attractions.ts` (last verified 21 Oct 2026). Go City changes prices
  and the attraction line-up, so re-check them periodically and update `GOCITY_DATA_VERIFIED`.
- **Prompts or schema changes** need a `CACHE_VERSION` bump (see above), otherwise visitors may get old cached itineraries.
- **Menu and footer links** are copied from WordPress by hand (see Site header and footer).

## Deploying

Pushing to `main` deploys to Vercel automatically. Check the result at <https://londontourpackage.com/planner>.
Cloudflare Worker, redirect rule and rate-limiting rule changes are made in the Cloudflare dashboard and are not part of this repository.

## Known gaps and ideas

- No affiliate disclosure is shown yet, although the planner contains Viator and Go City affiliate links.
  Consider a short disclosure near the results and in the footer, and check the partners' terms for required wording.
- No Content-Security-Policy header.
- `/planner/api/tours` has no app-level rate limit.
- Cloudflare Bot Fight Mode and an OpenAI model allow-list (`gpt-4o` only) are recommended but are account settings, not code.

## Project structure

```
src/app/            Pages, layout, favicon (icon.png) and API routes (/api/generate, /api/tours)
src/components/     SiteHeader and SiteFooter (copied from londontourpackage.com), social icon paths, tour options, progress, skeletons
src/assets/         Logo (imported, so its URL includes the /planner base path)
src/lib/            AI schema, cache, rate limit, proxy guard, Viator client, pass savings, affiliate links
scripts/            pregenerate.mjs (cache warm-up)
cloudflare/         Reference copy of the Cloudflare Worker (deployed from the Cloudflare dashboard, not from here)
next.config.ts      basePath, root redirect, security headers, Tailwind and Turbopack setup
```
