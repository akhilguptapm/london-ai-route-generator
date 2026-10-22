import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { DaySchema, OutlineSchema } from "@/lib/schema";
import { GOCITY_ATTRACTIONS } from "@/lib/gocity-attractions";

// Each day is planned in its own parallel model call, so total time no longer grows with trip length.
// maxDuration is a safety ceiling only.
export const maxDuration = 300;

const MODEL = openai("gpt-4o");
const DAY_ATTEMPTS = 2;

export async function POST(req: Request) {
  try {
    const { pace, days, interests, travelers, startLocation } = await req.json();

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
      Interests: ${Array.isArray(interests) && interests.length ? interests.join(", ") : "General Sightseeing"}.
      Base Location / Hotel Area: ${startLocation || "Central London"}.
    `;

    const totalDays = Math.max(1, Math.min(Number(days) || 1, 7));

    // Step 1 (fast): a title, summary and a distinct focus area per day, so parallel day plans don't overlap.
    const { output: outline } = await generateText({
      model: MODEL,
      output: Output.object({ schema: OutlineSchema }),
      system: systemPrompt,
      prompt: `
        Outline a ${totalDays}-day London itinerary. Return exactly ${totalDays} days (dayNumber 1 to ${totalDays}).
        Give each day a different geographic area and different headline sights - no attraction may appear on two days.
        ${tripBrief}
      `,
    });

    const outlineDays = Array.from({ length: totalDays }, (_, i) => outline.days[i]);

    // Step 2: plan every day in parallel (retrying once on failure).
    const planDay = async (index: number) => {
      const dayNumber = index + 1;
      const others = outlineDays
        .filter((_, i) => i !== index)
        .map((d, i) => d && `Day ${d.dayNumber ?? i + 1}: ${d.theme} (${d.area}; ${d.headlineSights.join(", ")})`)
        .filter(Boolean)
        .join("\n");
      const mine = outlineDays[index];

      for (let attempt = 1; attempt <= DAY_ATTEMPTS; attempt++) {
        try {
          const { output: day } = await generateText({
            model: MODEL,
            output: Output.object({ schema: DaySchema }),
            system: systemPrompt,
            prompt: `
              Plan ONLY Day ${dayNumber} of a ${totalDays}-day London itinerary (set dayNumber to ${dayNumber}).
              ${mine ? `This day's plan: ${mine.theme} - based around ${mine.area}, featuring ${mine.headlineSights.join(", ")}.` : ""}
              Other days already cover the following, so do NOT repeat these attractions:
              ${others || "(none)"}
              ${tripBrief}
            `,
          });
          return { ...day, dayNumber };
        } catch (err) {
          console.error(`Day ${dayNumber} generation failed (attempt ${attempt}):`, err);
        }
      }
      return null;
    };

    const dayPromises = Array.from({ length: totalDays }, (_, i) => planDay(i));

    // Stream the same JSON shape the client already parses (tripTitle, summary, days[]),
    // emitting each day as soon as it - and every day before it - is ready.
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(
              `{"tripTitle":${JSON.stringify(outline.tripTitle)},"summary":${JSON.stringify(outline.summary)},"days":[`
            )
          );
          let emitted = 0;
          for (const promise of dayPromises) {
            const day = await promise;
            if (!day) continue;
            controller.enqueue(encoder.encode(`${emitted ? "," : ""}${JSON.stringify(day)}`));
            emitted++;
          }
          controller.enqueue(encoder.encode("]}"));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Error generating itinerary:", error);
    return new Response(JSON.stringify({ error: "Failed to generate itinerary" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
