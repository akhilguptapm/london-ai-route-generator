This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

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
npm run pregenerate                                # local dev server
npm run pregenerate -- https://your-app.vercel.app # production
```

## Rate limiting

`/api/generate` limits **uncached** generations to 6 per 10 minutes per client IP (sliding window, `@upstash/ratelimit`,
configured in `src/lib/rate-limit.ts`). Cache hits are never limited since they cost nothing. Over the limit the API returns
`429` with a `Retry-After` header and the UI shows a friendly message. It uses the same Redis as the cache; with no Redis
configured (local dev) limiting is skipped, and if Redis errors the request is allowed through.
