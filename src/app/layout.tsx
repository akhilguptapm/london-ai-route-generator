import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";

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
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
