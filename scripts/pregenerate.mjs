#!/usr/bin/env node
// Warm the itinerary cache with the most common searches, so real visitors get them instantly.
//
//   npm run pregenerate                          # against the local dev server (http://localhost:3001)
//   npm run pregenerate -- https://your-app.vercel.app
//   npm run pregenerate -- --only "3 days"       # only presets whose name contains this text
//
// It calls the real /api/generate endpoint, so the cache key, prompts and validation are exactly what
// production uses. Presets already in the cache return instantly (X-Cache: HIT) and cost no tokens.
// Each NEW preset costs 1 outline + N day generations.

// Edit this list to match your analytics. The first preset is the form's default selection, so it is
// almost certainly the most-requested search.
const PRESETS = [
  { name: "3 days, first-timers (form default)", days: 3, pace: "Balanced", travelers: "Couple / 2 Adults", interests: ["Historical Palaces", "Museums", "Food & Markets"] },
  { name: "2 days, first-timers", days: 2, pace: "Balanced", travelers: "Couple / 2 Adults", interests: ["Historical Palaces", "Museums", "Food & Markets"] },
  { name: "4 days, first-timers", days: 4, pace: "Balanced", travelers: "Couple / 2 Adults", interests: ["Historical Palaces", "Museums", "Food & Markets"] },
  { name: "5 days, first-timers", days: 5, pace: "Balanced", travelers: "Couple / 2 Adults", interests: ["Historical Palaces", "Museums", "Food & Markets"] },
  { name: "1 day, first-timers", days: 1, pace: "Balanced", travelers: "Couple / 2 Adults", interests: ["Historical Palaces", "Museums", "Food & Markets"] },
  { name: "3 days, family with kids", days: 3, pace: "Relaxed", travelers: "Family with Kids", interests: ["Family Friendly", "Museums", "Parks & Views"] },
  { name: "3 days, solo traveler", days: 3, pace: "Balanced", travelers: "Solo Traveler", interests: ["Museums", "Food & Markets", "Hidden Gems"] },
];

const args = process.argv.slice(2);
const onlyIdx = args.indexOf("--only");
const only = onlyIdx >= 0 ? (args.splice(onlyIdx, 2)[1] ?? "").toLowerCase() : "";
const baseUrl = (args.find((a) => /^https?:\/\//.test(a)) ?? process.env.BASE_URL ?? "http://localhost:3001").replace(/\/$/, "");

const presets = PRESETS.filter((p) => p.name.toLowerCase().includes(only));
if (presets.length === 0) {
  console.error(`No preset matches "${only}".`);
  process.exit(1);
}

console.log(`Warming ${presets.length} preset(s) against ${baseUrl}\n`);

let failures = 0;
for (const { name, ...trip } of presets) {
  const started = Date.now();
  try {
    let res;
    // The API rate-limits uncached generations per IP; when that happens, wait it out and retry.
    for (let attempt = 1; ; attempt++) {
      // The app is served under basePath "/planner" (see next.config.ts).
      res = await fetch(`${baseUrl}/planner/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trip),
      });
      if (res.status !== 429 || attempt >= 3) break;
      const wait = Number(res.headers.get("Retry-After")) || 60;
      console.log(`  ... rate limited, waiting ${wait}s before retrying: ${name}`);
      await new Promise((r) => setTimeout(r, (wait + 1) * 1000));
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text(); // read the whole stream; the server caches once it completes

    const planned = JSON.parse(text).days?.length ?? 0;
    if (planned !== trip.days) throw new Error(`only ${planned}/${trip.days} days generated (not cached)`);

    const cache = res.headers.get("X-Cache") ?? "?";
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`  ok  ${cache.padEnd(4)} ${secs.padStart(5)}s  ${name}`);
  } catch (err) {
    failures++;
    console.log(`  FAIL        ${name}: ${err.message}`);
  }
}

console.log(failures ? `\n${failures} preset(s) failed.` : "\nDone - these searches now load instantly.");
process.exit(failures ? 1 : 0);
