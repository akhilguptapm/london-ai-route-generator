import Script from "next/script";

/**
 * Tracking tags copied from londontourpackage.com so the planner is measured the same way.
 *
 * - Google Tag Manager container GTM-K2LGXF6. On the main site this container also loads
 *   Microsoft Clarity and the Bing / Microsoft Advertising UET tag, so including it here
 *   brings both Microsoft tags to the planner as well.
 * - Google Analytics 4 (G-KM59N6SMSD) and Google Ads (AW-1017226386), loaded with gtag.js.
 *   On the main site these come from the Site Kit plugin, not from GTM, so they are added here too.
 *
 * Deliberately NOT copied: the retired Universal Analytics tag (UA-33653517-1), the AdSense script,
 * and the two Google Ads conversion events that fire on londontourpackage.com pages.
 * Add a conversion event here only if it should count planner visits as conversions.
 *
 * These IDs are public (they are visible in the page source of any site that uses them).
 */
export const GTM_ID = "GTM-K2LGXF6";
export const GA4_ID = "G-KM59N6SMSD";
export const GOOGLE_ADS_ID = "AW-1017226386";

/** Scripts: render once, inside <body> of the root layout. */
export function AnalyticsScripts() {
  return (
    <>
      <Script id="gtm" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
      </Script>
      <Script
        id="gtag-js"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('set','linker',{'domains':['londontourpackage.com']});gtag('config','${GA4_ID}');gtag('config','${GOOGLE_ADS_ID}');`}
      </Script>
    </>
  );
}

/** GTM fallback for visitors with JavaScript disabled. Must be the first child of <body>. */
export function AnalyticsNoScript() {
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="Google Tag Manager"
      />
    </noscript>
  );
}
