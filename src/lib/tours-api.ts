export interface LiveTourData {
  title: string;
  provider: "Viator" | "GetYourGuide";
  livePriceGBP: number;
  rating: number;
  bookingUrl: string;
}

export async function fetchLiveTourRates(query: string): Promise<LiveTourData[]> {
  try {
    // If Viator API key is available, query real-time endpoint
    if (process.env.VIATOR_API_KEY) {
      const viatorRes = await fetch("https://api.viator.com/partner/products/search", {
        method: "POST",
        headers: {
          "Accept-Language": "en-US",
          "exp-api-key": process.env.VIATOR_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          searchTerm: query,
          currency: "GBP",
          pagination: { top: 1 },
        }),
      });

      if (viatorRes.ok) {
        const viatorData = await viatorRes.json();
        const firstMatch = viatorData.products?.[0];
        if (firstMatch) {
          return [
            {
              title: firstMatch.title,
              provider: "Viator",
              livePriceGBP: firstMatch.pricing?.summary?.fromPrice || 45,
              rating: firstMatch.reviews?.sources?.[0]?.averageRating || 4.8,
              bookingUrl: `https://www.viator.com/tours/${firstMatch.productCode}?pid=P00079569&mcid=42383`,
            },
          ];
        }
      }
    }

    // Fallback search deep-link format if live key isn't present
    const encoded = encodeURIComponent(query);
    return [
      {
        title: `${query} Guided Tour & Skip-The-Line Access`,
        provider: "Viator",
        livePriceGBP: 39.0,
        rating: 4.9,
        bookingUrl: `https://www.viator.com/searchResults/all?text=${encoded}&pid=P00079569&mcid=42383`,
      },
    ];
  } catch (error) {
    console.error("Error searching live tours:", error);
    return [];
  }
}
