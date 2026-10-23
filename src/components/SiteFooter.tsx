import { Mail } from "lucide-react";
import { SOCIAL_ICON_PATHS } from "@/components/social-icon-paths";

const SITE_URL = "https://londontourpackage.com";

// Hard-coded on purpose: reading the current date in a server component conflicts with Cache Components.
// Update this each January.
const COPYRIGHT_YEAR = 2026;

// Same three link columns, in the same order, as the footer on londontourpackage.com.
const FOOTER_COLUMNS = [
  {
    title: "Important Links",
    links: [
      { label: "About Us", href: `${SITE_URL}/about-us/` },
      { label: "Contact US", href: `${SITE_URL}/contact-us/` },
      { label: "Cookie Policy", href: `${SITE_URL}/cookie-policy/` },
      { label: "Privacy Policy", href: `${SITE_URL}/privacy-policy/` },
      { label: "Link with Us", href: `${SITE_URL}/link-with-us/` },
      { label: "FAQ’s", href: `${SITE_URL}/frequently-asked-questions-faqs/` },
    ],
  },
  {
    title: "Categories",
    links: [
      { label: "Travel to London", href: `${SITE_URL}/category/travel-to-london/` },
      { label: "Night Life", href: `${SITE_URL}/category/night-life/` },
      { label: "London Attractions", href: `${SITE_URL}/category/attraction/` },
      { label: "Shopping in London", href: `${SITE_URL}/shopping-in-london/` },
      { label: "London Culture", href: `${SITE_URL}/category/culture/` },
      { label: "Visa for London", href: `${SITE_URL}/category/visa/` },
    ],
  },
  {
    title: "Other Useful Links",
    links: [
      { label: "Blog", href: `${SITE_URL}/category/blog/` },
      { label: "London News", href: `${SITE_URL}/category/london-news/` },
      { label: "London Weather", href: `${SITE_URL}/london-weather/` },
      { label: "COVID-19", href: `${SITE_URL}/category/london-news/covid-19/` },
      { label: "History of London", href: `${SITE_URL}/category/history-of-london/` },
    ],
  },
] as const;

const SOCIAL_LINKS = [
  { label: "Facebook", href: "https://www.facebook.com/Londontourpackage", icon: "facebook" },
  { label: "X (Twitter)", href: "https://twitter.com/londontourpack", icon: "x" },
  { label: "Instagram", href: "https://www.instagram.com/londontourpackage/", icon: "instagram" },
  { label: "Pinterest", href: "https://in.pinterest.com/londontourpackage/", icon: "pinterest" },
  { label: "LinkedIn", href: "https://linkedin.com/company/london-tour-package/", icon: "linkedin" },
  { label: "YouTube", href: "https://www.youtube.com/c/LondonTourPackage/", icon: "youtube" },
  { label: "Tumblr", href: "https://londontourpackage.tumblr.com/", icon: "tumblr" },
  { label: "VKontakte", href: "https://vk.com/londontourpackage", icon: "vk" },
] as const;

const linkClass =
  "text-white/90 hover:text-white underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none transition-colors";

const columnTitleClass = "text-xs font-normal uppercase tracking-[0.4em] text-white mb-5";

export function SiteFooter() {
  return (
    <footer className="bg-black text-white mt-8 sm:mt-12">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10 sm:py-14 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
        {FOOTER_COLUMNS.map((column, columnIndex) => {
          const isLast = columnIndex === FOOTER_COLUMNS.length - 1;
          return (
            <div key={column.title}>
              <h2 className={columnTitleClass}>{column.title}</h2>
              <ul className="space-y-3 text-base">
                {column.links.map(({ label, href }) => (
                  <li key={label}>
                    <a href={href} className={linkClass}>
                      {label}
                    </a>
                  </li>
                ))}
              </ul>

              {/* "Follow Us" sits under the last column, like on the main site */}
              {isLast && (
                <div className="mt-10">
                  <h2 className={columnTitleClass}>Follow Us</h2>
                  <ul className="flex flex-wrap items-center gap-x-5 gap-y-4">
                    {SOCIAL_LINKS.map(({ label, href, icon }) => (
                      <li key={label}>
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={label}
                          title={label}
                          className="block text-white/90 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white transition-colors"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width="22"
                            height="22"
                            fill="currentColor"
                            aria-hidden="true"
                            focusable="false"
                          >
                            <path d={SOCIAL_ICON_PATHS[icon]} />
                          </svg>
                        </a>
                      </li>
                    ))}
                    <li>
                      <a
                        href="mailto:info@londontourpackage.com"
                        aria-label="Email"
                        title="Email"
                        className="block text-white/90 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white transition-colors"
                      >
                        <Mail className="w-[22px] h-[22px]" aria-hidden="true" />
                      </a>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-white/10">
        <p className="max-w-5xl mx-auto px-5 sm:px-8 py-5 text-center text-xs text-neutral-400">
          © {COPYRIGHT_YEAR} London Tour Package. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
