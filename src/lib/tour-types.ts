// Client-safe types shared by the /api/tours route and the UI.

export type AvailabilityStatus = "available" | "unavailable" | "unknown";

export interface TourAvailability {
  status: AvailabilityStatus;
  travelDate: string; // YYYY-MM-DD
  /** Live total (USD) for the requested travellers, when available on that date */
  totalPriceUSD?: number;
}

export interface ViatorTour {
  productCode: string;
  title: string;
  /** Live "from" price per person in USD */
  fromPriceUSD: number | null;
  rating: number | null;
  reviewCount: number;
  durationText: string | null;
  freeCancellation: boolean;
  imageUrl: string | null;
  /** Affiliate link returned by Viator (already contains pid / mcid / campaign) */
  bookingUrl: string;
  availability?: TourAvailability;
}

export interface ToursApiResponse {
  results: Record<string, ViatorTour[]>;
  /** False when no Viator API key is configured on the server */
  configured: boolean;
  /** Number of attraction look-ups that failed (e.g. rate limit / bad key) */
  failedLookups: number;
}
