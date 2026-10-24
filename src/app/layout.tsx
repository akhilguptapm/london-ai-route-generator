import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AnalyticsNoScript, AnalyticsScripts } from "@/components/Analytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
  colorScheme: "light",
};

export const metadata: Metadata = {
  // The planner is served from londontourpackage.com/planner (via Cloudflare), so that is its canonical address.
  // This also stops the *.vercel.app copy from competing with it in Google.
  metadataBase: new URL("https://londontourpackage.com"),
  alternates: { canonical: "https://londontourpackage.com/planner" },
  robots: { index: true, follow: true },
  title: "AI London Itinerary & Custom Tour Planner | London Tour Package",
  description:
    "Plan custom London itineraries in seconds. Get AI-optimized routes, tube transit tips, live tour ticket rates, and London Pass savings. Build your route now!",
  openGraph: {
    title: "AI London Itinerary & Custom Tour Planner",
    description:
      "Generate custom London travel routes with live partner pricing and pass savings.",
    url: "https://londontourpackage.com/planner",
    siteName: "London Tour Package",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AnalyticsNoScript />
        <SiteHeader />
        {children}
        <SiteFooter />
        <AnalyticsScripts />
      </body>
    </html>
  );
}
