import { openai } from "@ai-sdk/openai";
import { streamObject } from "ai";
import { ItinerarySchema } from "@/lib/schema";

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
      3. Tag if the attraction is included in the London Pass (isLondonPassIncluded: true/false).
      4. For every attraction where visitors can book a ticket, tour or experience (e.g. Tower of London,
         Westminster Abbey, Windsor Castle, Harry Potter Studio, museums, river cruises, the London Eye),
         set 'tourSearchTerm' to the attraction's official name. Live prices, availability and booking
         links are looked up automatically afterwards, so NEVER write prices, ratings or URLs yourself.
         Set 'tourSearchTerm' to null for dining, transit, parks and free sights.
      5. Include estimated London Pass savings in GBP (£).
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
