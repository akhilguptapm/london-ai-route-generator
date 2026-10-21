/** USD formatting helpers (safe for client use). */
/** Approximate GBP -> USD rate, used only to repair stray "£" amounts from the AI. */
const GBP_TO_USD = 1.27;

/** Format a number as US dollars, e.g. 1234.5 -> "$1,234.50". */
export function formatUSD(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/**
 * Normalise an AI-written savings string so it is always in USD.
 * "£75" -> "$95", "Save £75-£90" -> "Save $95-$114"; USD text passes through untouched.
 */
export function toUSDText(text: string): string {
  if (!text.includes("£")) return text;
  return text.replace(/£\s?(\d[\d,]*(?:\.\d+)?)/g, (_, n: string) => {
    const usd = Math.round(parseFloat(n.replace(/,/g, "")) * GBP_TO_USD);
    return `$${usd.toLocaleString("en-US")}`;
  });
}
