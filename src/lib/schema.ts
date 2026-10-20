import { z } from "zod";

export const ItinerarySchema = z.object({
  tripTitle: z.string().describe("Catchy title for the generated London itinerary"),
  summary: z.string().describe("Brief overview of the route strategy and pacing"),
  estimatedPassSavings: z.string().describe("Estimated £ savings if using London Pass"),
  days: z.array(
    z.object({
      dayNumber: z.number(),
      theme: z.string().describe("Theme for the day, e.g., Historical Palaces & Westminster"),
      schedule: z.array(
        z.object({
          timeSlot: z.string().describe("e.g. 09:00 AM - 11:30 AM"),
          attractionName: z.string(),
          category: z.enum(["must-see", "palace", "museum", "family", "dining", "transit"]),
          description: z.string().describe("Short tip or historical context"),
          transitTip: z.string().describe("Tube/Bus route from previous stop"),
          isLondonPassIncluded: z.boolean(),
          liveTourRecommendation: z
            .object({
              title: z.string(),
              provider: z.enum(["Viator", "GetYourGuide"]),
              livePriceGBP: z.number(),
              rating: z.number(),
              bookingUrl: z.string()
            })
            .optional()
        })
      )
    })
  )
});

export type Itinerary = z.infer<typeof ItinerarySchema>;
