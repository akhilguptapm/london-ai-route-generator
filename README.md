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
- **Rate limiting.** Protects the AI endpoint from abuse.

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router, Cache Components) with React 19 and TypeScript
- [Vercel AI SDK](https://ai-sdk.dev) with OpenAI (`gpt-4o`) for itinerary generation
- Tailwind CSS 4 and `lucide-react` icons
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
| `PLANNER_PROXY_SECRET` | In production | Shared secret with the Cloudflare Worker (see Security). Leave unset locally. |

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
- **Vercel root redirect.** `next.config.ts` redirects `/` to `/planner`, so the bare `*.vercel.app` address still opens the app.
- **Cloudflare Worker** (`london-ai-planner-proxy`, route `londontourpackage.com/planner*`) forwards `/planner` requests to
  the Vercel app. It redirects look-alike paths such as `/plannerfoo` or `/Planner` to `/planner`, and rewrites any
  Vercel redirect so visitors stay on `londontourpackage.com`.
- **Cloudflare Redirect Rule** ("Planner typo redirects") sends common typos such as `/plannr`, `/planer`,
  `/planner-tool`, `/route-planner` and `/itinerary` to `/planner` (302). Add paths there, and first check that none is a real WordPress page.
- Do not add `londontourpackage.com` as a domain in the Vercel project. Cloudflare does the routing.

## Security

- **Only the Worker may call the APIs.** The Worker adds `x-planner-proxy-secret` (a shared secret) and
  `x-planner-client-ip` (the visitor's real IP) to every request it forwards. When `PLANNER_PROXY_SECRET` is set
  in Vercel, `/planner/api/generate` and `/planner/api/tours` return `403` for any request without the correct
  secret, so calling the `*.vercel.app` address directly cannot skip Cloudflare or burn OpenAI credits.
  The logic is in `src/lib/proxy-guard.ts`. With the variable unset (local dev) nothing is enforced.
- **Rate limiting uses the real visitor IP.** Behind Cloudflare, Vercel only sees Cloudflare's IPs, so
  `getClientId` in `src/lib/rate-limit.ts` reads `x-planner-client-ip`, but only when the secret is valid.
- **Rotating the secret:** generate a new value (`openssl rand -hex 32`), update the Cloudflare Worker secret first
  and then the Vercel env var (then redeploy). Briefly, requests can be rejected between the two steps.
- **Security headers** (`nosniff`, `Referrer-Policy`, `X-Frame-Options: SAMEORIGIN`, `Permissions-Policy`) are set in
  `next.config.ts`. There is no Content-Security-Policy yet.
- **Spending limits:** set a monthly budget and alerts in the OpenAI dashboard as a last line of defence.
- Dependabot alerts and security updates are enabled in the GitHub repository settings.

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
npm run pregenerate -- https://your-app.vercel.app # production (the script adds /planner itself)
npm run pregenerate -- --only "3 days"             # only presets whose name contains this text
```

## Rate limiting

`/planner/api/generate` limits **uncached** generations to 6 per 10 minutes per client IP (sliding window, `@upstash/ratelimit`,
configured in `src/lib/rate-limit.ts`). Cache hits are never limited since they cost nothing. Over the limit the API returns
`429` with a `Retry-After` header and the UI shows a friendly message. It uses the same Redis as the cache; with no Redis
configured (local dev) limiting is skipped, and if Redis errors the request is allowed through.

## Keeping data up to date

- **Go City pass prices** are stored in `src/lib/gocity-attractions.ts` (last verified 21 Oct 2026). Go City changes prices
  and the attraction line-up, so re-check them periodically and update `GOCITY_DATA_VERIFIED`.
- **Prompts or schema changes** need a `CACHE_VERSION` bump (see above), otherwise visitors may get old cached itineraries.

## Deploying

Pushing to `main` deploys to Vercel automatically. Check the result at <https://londontourpackage.com/planner>.
Cloudflare Worker and redirect rule changes are made in the Cloudflare dashboard and are not part of this repository.

## Project structure

```
src/app/            Pages, layout and API routes (/api/generate, /api/tours)
src/components/     UI components (tour options, progress, skeletons)
src/lib/            AI schema, cache, rate limit, Viator client, pass savings, affiliate links
scripts/            pregenerate.mjs (cache warm-up)
next.config.ts      basePath, root redirect, Tailwind and Turbopack setup
```
