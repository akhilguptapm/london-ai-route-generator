"use client";

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { Menu, X } from "lucide-react";
// Imported (not referenced by a "/logo.png" string) so the URL automatically includes the /planner basePath.
import logo from "@/assets/logo.png";

const SITE_URL = "https://londontourpackage.com";

// The "AI Route Planner" menu item: this app. It is a red pill on desktop and bold red text on phones,
// with a NEW badge that hides itself on the same date as the WordPress badge (see NEW_BADGE_UNTIL).
const PLANNER_LINK = { label: "AI Route Planner", href: `${SITE_URL}/planner` } as const;

// Hide the NEW badge from 21 Feb 2027 (120 days after launch on 24 Oct 2026), London time.
// This must match the expiry date in the WPCode snippet on the WordPress site.
const NEW_BADGE_UNTIL = Date.UTC(2027, 1, 21); // month is 0-based: 1 = February

const subscribeNever = () => () => {}; // the date never "changes" while the page is open
const badgeStillValid = () => Date.now() < NEW_BADGE_UNTIL;

// The other five main-menu items, in the same order as the London Tour Package website
// (Appearance > Menus > "Main" in WordPress). Keep these and PLANNER_LINK in sync with that menu.
const NAV_LINKS = [
  { label: "Attractions", href: `${SITE_URL}/london-attractions/` },
  { label: "Tours", href: `${SITE_URL}/category/tours/` },
  { label: "Restaurants & Pubs", href: `${SITE_URL}/category/restaurants/` },
  { label: "Getting Around", href: `${SITE_URL}/getting-around-in-london/` },
  { label: "Accommodation", href: `${SITE_URL}/accommodation-in-london/` },
] as const;

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  // The server always renders the badge; the browser checks the date after the page loads (this avoids reading
  // the current time during server rendering, which conflicts with Cache Components).
  const showNewBadge = useSyncExternalStore(subscribeNever, badgeStillValid, () => true);

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
          {/* AI Route Planner: this page, so it is shown as the active (navy) item */}
          <li className="relative border-b border-slate-100 md:border-b-0">
            <a
              href={PLANNER_LINK.href}
              aria-current="page"
              className="block py-3 text-sm font-bold uppercase tracking-wide text-[#0B2A6B] md:text-white md:bg-[#0B2A6B] md:rounded-full md:px-3 md:py-1.5 md:my-1.5 transition-colors"
            >
              <span aria-hidden="true" className="mr-1.5 text-[0.8em]">
                ✦
              </span>
              {PLANNER_LINK.label}
              {showNewBadge && (
                <span className="ml-2 rounded-lg bg-[#0B2A6B] px-1.5 py-0.5 align-middle text-[10px] font-semibold leading-tight tracking-wide text-white md:absolute md:-right-2 md:-top-1 md:ml-0 md:border md:border-white md:px-1.5 md:py-px md:text-[8px] md:bg-[#C8102E]">
                  NEW
                </span>
              )}
            </a>
          </li>
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
