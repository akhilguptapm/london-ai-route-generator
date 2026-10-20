import { openai } from "@ai-sdk/openai";
import { streamObject } from "ai";
import { ItinerarySchema } from "@/lib/schema";
import { fetchLiveTourRates } from "@/lib/tours-api";

// Allow execution up to 60s for Vercel serverless function
export const maxDuration = 60;

// Major landmarks that warrant a guided tour / skip-the-line recommendation.
const TOUR_LOOKUP_QUERIES = [
  "Tower of London",
  "Westminster Abbey",
  "Windsor Castle",
  "Harry Potter Studio Tour London",
];

export async function POST(req: Request) {
  try {
    const { pace, days, interests, travelers, startLocation } = await req.json();

    // Real-time tour lookup. streamObject doesn't support tool calls, so we
    // resolve live rates up-front and hand them to the model as grounded data.
    const liveTours = (
      await Promise.all(
        TOUR_LOOKUP_QUERIES.map(async (query) => ({
          query,
          tours: await fetchLiveTourRates(query),
        }))
      )
    ).filter(({ tours }) => tours.length > 0);

    const liveToursContext = liveTours.length
      ? liveTours
          .map(({ query, tours }) => `- ${query}: ${JSON.stringify(tours[0])}`)
          .join("\n")
      : "No live tour data available. Omit 'liveTourRecommendation'.";

    const systemPrompt = `
      You are an expert London Route Planner, Transit Specialist, and Affiliate Optimization Engine.
      Generate a realistic day-by-day travel itinerary based on user preferences and constraints.

      RULES & CONSTRAINTS:
      1. Cluster attractions geographically (e.g. Tower Bridge, Tower of London, and Borough Market together).
      2. Provide precise transit tips between destinations using London Underground (Tube), Bus, or River Bus.
      3. Tag if the attraction is included in the London Pass (isLondonPassIncluded: true/false).
      4. For major landmarks (e.g. Tower of London, Westminster Abbey, Windsor Castle, Harry Potter Studio),
         suggest a guided tour or skip-the-line option under 'liveTourRecommendation'.
         Use ONLY the live tour data below (copy title, provider, livePriceGBP, rating and bookingUrl exactly).
         Never invent prices or booking URLs.
      5. Include estimated London Pass savings in GBP (£).

      LIVE TOUR DATA:
      ${liveToursContext}
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
