"use client";

import { useState } from "react";
import Image from "next/image";
import { Menu, X } from "lucide-react";
// Imported (not referenced by a "/logo.png" string) so the URL automatically includes the /planner basePath.
import logo from "@/assets/logo.png";

const SITE_URL = "https://londontourpackage.com";

// Same six main-menu items, in the same order, as the London Tour Package website.
const NAV_LINKS = [
  { label: "Attractions", href: `${SITE_URL}/london-attractions/` },
  { label: "Tours", href: `${SITE_URL}/category/tours/` },
  { label: "Restaurants & Pubs", href: `${SITE_URL}/category/restaurants/` },
  { label: "Entertainment", href: `${SITE_URL}/category/entertainment/` },
  { label: "Getting Around", href: `${SITE_URL}/getting-around-in-london/` },
  { label: "Accommodation", href: `${SITE_URL}/accommodation-in-london/` },
] as const;

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 md:px-8">
        {/* Logo row (hamburger on the left on mobile, like the main site) */}
        <div className="relative flex items-center justify-center pt-4 sm:pt-6">
          <button
            type="button"
            className="md:hidden absolute left-0 top-1/2 -translate-y-1/2 p-2 -ml-2 text-slate-900 rounded-lg hover:bg-slate-100"
            aria-expanded={menuOpen}
            aria-controls="site-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <a href={SITE_URL} aria-label="London Tour Package home" className="block">
            <Image
              src={logo}
              alt="London Tour Package"
              priority
              unoptimized
              className="h-auto w-[130px] sm:w-[170px] md:w-[190px]"
            />
          </a>
        </div>

        <p className="text-center text-[10px] sm:text-xs font-medium uppercase tracking-[0.3em] sm:tracking-[0.4em] text-slate-900 mt-2 sm:mt-3 pb-3 sm:pb-4">
          Your personal London travel guide
        </p>
      </div>

      {/* Main menu */}
      <nav
        id="site-nav"
        aria-label="Main"
        className={`${menuOpen ? "block" : "hidden"} md:block border-t border-slate-200`}
      >
        <ul className="max-w-5xl mx-auto px-3 sm:px-6 md:px-8 flex flex-col md:flex-row md:flex-wrap md:items-center md:justify-center md:gap-x-8 py-1 md:py-0">
          {NAV_LINKS.map(({ label, href }) => (
            <li key={label} className="border-b border-slate-100 last:border-b-0 md:border-b-0">
              <a
                href={href}
                className="block py-3 text-sm font-semibold uppercase tracking-wide text-slate-900 hover:text-[#C8102E] focus-visible:text-[#C8102E] transition-colors"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
