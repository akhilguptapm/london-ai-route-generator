import { z } from "zod";

export const ItinerarySchema = z.object({
  tripTitle: z.string().describe("Catchy title for the generated London itinerary"),
  summary: z.string().describe("Brief overview of the route strategy and pacing"),
  days: z.array(
    z.object({
      dayNumber: z.number(),
      theme: z.string().describe("Theme for the day, e.g., Historical Palaces & Westminster"),
      dayDescription: z
        .string()
        .describe(
          "1-2 sentences previewing what the traveller will explore and visit that day (the main sights and the feel of the day)."
        ),
      schedule: z.array(
        z.object({
          timeSlot: z.string().describe("e.g. 09:00 AM - 11:30 AM"),
          attractionName: z.string(),
          category: z.enum(["must-see", "palace", "museum", "family", "dining", "transit"]),
          description: z.string().describe("Short tip or historical context"),
          transitTip: z.string().describe("Tube/Bus route from previous stop"),
          tourSearchTerm: z
            .string()
            .nullable()
            .describe(
              "Official attraction name to look up bookable tours/tickets for (e.g. 'Tower of London'). Null for dining, transit, parks and free sights with nothing to book."
            ),
          fallback: z
            .object({
              photoTip: z
                .string()
                .describe(
                  "One sentence: the best spot to see/photograph this attraction from outside, so the stop is still worthwhile without a ticket or tour."
                ),
              nearbyAlternative: z.object({
                name: z.string().describe("A real sight within ~10 min walk that is free or easy to visit without booking"),
                description: z.string().describe("One short sentence on why it is worth visiting"),
                tourSearchTerm: z
                  .string()
                  .nullable()
                  .describe(
                    "Official name to look up bookable tours/tickets for if this alternative is ticketed (e.g. 'Houses of Parliament'). Null if it is free / nothing to book."
                  )
              }),
              mealSuggestion: z
                .object({
                  name: z.string().describe("A real, well-regarded cafe/restaurant/pub/market within ~10 min walk"),
                  mealType: z.enum(["breakfast", "coffee", "lunch", "dinner"]),
                  description: z.string().describe("One short sentence: cuisine / what to order / price feel")
                })
                .nullable()
                .describe(
                  "Use 'lunch' if the time slot overlaps 12:00-14:30, 'dinner' if it overlaps 18:00-21:00, 'breakfast' before 10:00, otherwise 'coffee'. Null only if the slot is under 1 hour."
                )
            })
            .nullable()
            .describe(
              "Plan B shown ONLY if no tours are bookable on the traveller's date. Provide for every item with a tourSearchTerm; null when tourSearchTerm is null."
            )
        })
      )
    })
  )
});

export type Itinerary = z.infer<typeof ItinerarySchema>;
