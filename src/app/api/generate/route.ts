import { openai } from "@ai-sdk/openai";
import { generateText, streamText, Output } from "ai";
import { DaySchema, OutlineSchema } from "@/lib/schema";
import { GOCITY_ATTRACTIONS } from "@/lib/gocity-attractions";
import { DayChannel } from "@/lib/day-channel";
import { buildCacheKey, getCachedItinerary, setCachedItinerary } from "@/lib/itinerary-cache";
import { checkGenerateRateLimit, getClientId } from "@/lib/rate-limit";
import { rejectIfNotFromProxy } from "@/lib/proxy-guard";
import { normalizeTripRequest } from "@/lib/trip-options";

// Each day is planned in its own parallel model call, so total time no longer grows with trip length.
// maxDuration is a safety ceiling only.
export const maxDuration = 300;

const MODEL_ID = "gpt-4o";
const MODEL = openai(MODEL_ID);
const DAY_ATTEMPTS = 2;

const STREAM_HEADERS = { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" };

export async function POST(req: Request) {
  // Only accept requests that came through the Cloudflare Worker (no-op until PLANNER_PROXY_SECRET is set).
  const blocked = rejectIfNotFromProxy(req);
  if (blocked) return blocked;

  try {
    // Normalise first: it keeps junk out of the prompt and makes equivalent searches share one cache key.
    const trip = normalizeTripRequest(await req.json().catch(() => null));
    const { pace, days, interests, travelers, startLocation } = trip;

    // Repeat searches are served from cache: instant, and no tokens spent.
    const cacheKey = buildCacheKey(trip, MODEL_ID);
    const cached = await getCachedItinerary(cacheKey);
    if (cached) {
      return new Response(cached, { headers: { ...STREAM_HEADERS, "X-Cache": "HIT" } });
    }

    // Only uncached generations cost tokens, so only they are rate limited (per client IP).
    const limit = await checkGenerateRateLimit(getClientId(req));
    if (!limit.allowed) {
      const minutes = Math.ceil(limit.retryAfterSeconds / 60);
      return new Response(
        JSON.stringify({
          error: "rate_limited",
          message: `You've planned a lot of trips in a short time. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
          retryAfterSeconds: limit.retryAfterSeconds,
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", "Retry-After": String(limit.retryAfterSeconds) },
        }
      );
    }

    const systemPrompt = `
      You are an expert London Route Planner, Transit Specialist, and Affiliate Optimization Engine.
      Generate a realistic day-by-day travel itinerary based on user preferences and constraints.

      RULES & CONSTRAINTS:
      1. Cluster attractions geographically (e.g. Tower Bridge, Tower of London, and Borough Market together).
      2. Provide precise transit tips between destinations using London Underground (Tube), Bus, or River Bus.
      3. Where it fits the traveller's interests, prefer attractions covered by a Go City London Pass and use
         their exact official names. Covered attractions: ${GOCITY_ATTRACTIONS.map((x) => x.name).join("; ")}.
         NEVER write prices, savings amounts or pass coverage yourself - these are calculated automatically.
         If a description must mention a cost, call it an "estimated walk-up gate rate" in US dollars ("~$"), never an exact price, and never use £.
      4. For every attraction where visitors can book a ticket, tour or experience (e.g. Tower of London,
         Westminster Abbey, Windsor Castle, Harry Potter Studio, museums, river cruises, the London Eye),
         set 'tourSearchTerm' to the attraction's official name. Live prices, availability and booking
         links are looked up automatically afterwards, so NEVER write prices, ratings or URLs yourself.
         Set 'tourSearchTerm' to null for dining, transit, parks and free sights.
      5. For every item with a non-null 'tourSearchTerm', also fill 'fallback' (an "Alternate Route Suggestion" used when
         tours are sold out or unavailable on the traveller's date): an outside photo spot, a real nearby alternative sight
         (set its 'tourSearchTerm' to the official name if it is ticketed, so it can be booked, else null), and a
         real nearby cafe/restaurant matching the time slot (lunch around midday, dinner in the evening, otherwise
         coffee). Use only real, well-known places; never invent venues. Set 'fallback' to null when 'tourSearchTerm' is null.
      6. For every day, write 'dayDescription': 1-2 friendly sentences previewing what the traveller will explore and
         visit that day (name the headline sights and the overall feel). No prices, no URLs.
    `;

    const tripBrief = `
      Travelers: ${travelers}.
      Pace: ${pace}.
      Interests: ${interests.length ? interests.join(", ") : "General Sightseeing"}.
      Base Location / Hotel Area: ${startLocation}.
    `;

    const totalDays = days;

    // Stop all in-flight model calls if the client disconnects (e.g. the user hits "Stop").
    const abort = new AbortController();
    req.signal.addEventListener("abort", () => abort.abort());

    // Step 1 (fast): a title, summary and a distinct focus area per day, so parallel day plans don't overlap.
    const { output: outline } = await generateText({
      model: MODEL,
      abortSignal: abort.signal,
      output: Output.object({ schema: OutlineSchema }),
      system: systemPrompt,
      prompt: `
        Outline a ${totalDays}-day London itinerary. Return exactly ${totalDays} days (dayNumber 1 to ${totalDays}).
        Give each day a different geographic area and different headline sights - no attraction may appear on two days.
        ${tripBrief}
      `,
    });

    const outlineDays = Array.from({ length: totalDays }, (_, i) => outline.days[i]);

    // Step 2: plan every day in parallel. Each day streams its JSON text token-by-token into a DayChannel.
    // A failed attempt is retried once, invisibly, as long as none of that day's text has reached the client.
    const planDay = (index: number): DayChannel => {
      const dayNumber = index + 1;
      const others = outlineDays
        .filter((_, i) => i !== index)
        .map((d, i) => d && `Day ${d.dayNumber ?? i + 1}: ${d.theme} (${d.area}; ${d.headlineSights.join(", ")})`)
        .filter(Boolean)
        .join("\n");
      const mine = outlineDays[index];
      const channel = new DayChannel();

      void (async () => {
        for (let attempt = 1; attempt <= DAY_ATTEMPTS; attempt++) {
          try {
            const result = streamText({
              model: MODEL,
              abortSignal: abort.signal,
              output: Output.object({ schema: DaySchema }),
              system: systemPrompt,
              prompt: `
              Plan ONLY Day ${dayNumber} of a ${totalDays}-day London itinerary (set dayNumber to ${dayNumber}).
              ${mine ? `This day's plan: ${mine.theme} - based around ${mine.area}, featuring ${mine.headlineSights.join(", ")}.` : ""}
              Other days already cover the following, so do NOT repeat these attractions:
              ${others || "(none)"}
              ${tripBrief}
            `,
              // streamText reports errors through this callback (they never throw from the text stream).
              onError: ({ error }) => console.error(`Day ${dayNumber} stream error (attempt ${attempt}):`, error),
            });

            for await (const chunk of result.textStream) channel.push(chunk);
            await result.output; // throws if the stream died early or the JSON doesn't match DaySchema
            channel.finish();
            return;
          } catch (err) {
            console.error(`Day ${dayNumber} generation failed (attempt ${attempt}):`, err);
            if (abort.signal.aborted || channel.committed) break; // can't retry once bytes are with the client
            channel.reset();
          }
        }
        channel.fail();
      })();

      return channel;
    };

    const channels = Array.from({ length: totalDays }, (_, i) => planDay(i));

    // Stream the same JSON shape the client already parses (tripTitle, summary, days[]).
    // Days go out in order: the current day is forwarded live, chunk-by-chunk, while later days keep
    // generating in parallel and flush the moment their turn comes.
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let full = "";
        const emit = (text: string) => {
          full += text;
          controller.enqueue(encoder.encode(text));
        };

        try {
          emit(`{"tripTitle":${JSON.stringify(outline.tripTitle)},"summary":${JSON.stringify(outline.summary)},"days":[`);

          let emitted = 0;
          for (const channel of channels) {
            let started = false;
            for await (const chunk of channel) {
              if (!started) {
                started = true;
                if (emitted) emit(",");
              }
              emit(chunk);
            }
            if (started) emitted++;
            // The day broke after part of it was already sent: the JSON can't be repaired, so end with an error.
            if (channel.failed && started) throw new Error("A day failed after it had started streaming");
          }
          emit("]}");

          // Only cache complete trips - never a partial one that would keep being served.
          if (emitted === totalDays && !abort.signal.aborted) {
            await setCachedItinerary(cacheKey, full);
          }
          controller.close();
        } catch (err) {
          console.error("Itinerary stream failed:", err);
          try {
            controller.error(err);
          } catch {
            // already closed / cancelled by the client
          }
        }
      },
      cancel() {
        abort.abort(); // client went away: stop spending tokens
      },
    });

    return new Response(stream, { headers: { ...STREAM_HEADERS, "X-Cache": "MISS" } });
  } catch (error) {
    console.error("Error generating itinerary:", error);
    return new Response(JSON.stringify({ error: "Failed to generate itinerary" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
