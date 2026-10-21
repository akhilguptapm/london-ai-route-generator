import { openai } from "@ai-sdk/openai";
import { streamObject } from "ai";
import { ItinerarySchema } from "@/lib/schema";
import { GOCITY_ATTRACTIONS } from "@/lib/gocity-attractions";

// Allow execution up to 60s for Vercel serverless function
export const maxDuration = 60;

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
    `;

    const userPrompt = `
      Plan a ${days}-day London itinerary for ${travelers} traveler(s).
      Pace: ${pace}.
      Interests: ${Array.isArray(interests) && interests.length ? interests.join(", ") : "General Sightseeing"}.
      Base Location / Hotel Area: ${startLocation || "Central London"}.
    `;

    const result = streamObject({
      model: openai("gpt-4o"),
      schema: ItinerarySchema,
      system: systemPrompt,
      prompt: userPrompt,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Error generating itinerary:", error);
    return new Response(JSON.stringify({ error: "Failed to generate itinerary" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
