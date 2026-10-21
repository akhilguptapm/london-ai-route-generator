/**
 * Go City London pass data, in USD, as displayed on gocity.com with the currency selector set to
 * "US Dollar ($)" — https://gocity.com/en/london/passes and /en/london/attractions.
 *
 * LAST VERIFIED: 21 Oct 2026. Go City changes prices and the attraction line-up, so re-check
 * periodically (see README note) — `walkUpUSD` is Go City's own "Without a pass: up to $X"
 * adult walk-up price, i.e. the same figure Go City uses for its guaranteed-savings calculation.
 */
export const GOCITY_DATA_VERIFIED = "2026-10-21";

export type PassTier = "explorer" | "allInclusive";

export interface GoCityAttraction {
  name: string;
  /** Adult walk-up price in USD ("Without a pass: up to $X"). */
  walkUpUSD: number;
  /**
   * "explorer"     = covered by Explorer AND All-Inclusive passes ("All passes" on Go City)
   * "allInclusive" = covered by the All-Inclusive pass only
   */
  tier: PassTier;
  /** Other names an itinerary might use for the exact same product. Keep these strict. */
  aliases?: string[];
}

const a = (name: string, walkUpUSD: number, aliases?: string[]): GoCityAttraction => ({
  name,
  walkUpUSD,
  tier: "explorer",
  aliases,
});
const i = (name: string, walkUpUSD: number, aliases?: string[]): GoCityAttraction => ({
  name,
  walkUpUSD,
  tier: "allInclusive",
  aliases,
});

export const GOCITY_ATTRACTIONS: GoCityAttraction[] = [
  a("Tower of London", 49),
  a("City Cruises 24 Hour Thames River Pass", 33, ["city cruises thames", "thames river cruise hop on hop off"]),
  i("English Breakfast at Bill's Soho", 24),
  a("The London Eye", 52, ["london eye"]),
  a("2-Day Hop-On Hop-Off Bus Tour", 75, ["hop on hop off bus tour", "hop on hop off london bus"]),
  a("St Paul's Cathedral", 36, ["saint pauls cathedral"]),
  a("Up at The O2", 59),
  a("Arsenal Stadium Tour", 43, ["emirates stadium tour"]),
  a("Moco Museum London", 49),
  a("Kensington Palace", 33),
  a("Tower Bridge", 24, ["tower bridge exhibition"]),
  a("The Royal Mews, Buckingham Palace", 24, ["royal mews"]),
  a("Windsor Castle", 48),
  a("Westminster Abbey", 43),
  a("The View from The Shard", 43, ["the shard", "shard viewing", "view from the shard"]),
  a("Madame Tussauds London", 52, ["madame tussauds"]),
  i("Afternoon Tea at Huffkins Oxford Street", 43),
  a("See Over 30 Top London Sights with Fun Local Guide", 63),
  i("Bites & Drinks at Burger & Lobster Restaurant Oxford Circus", 33),
  a("HMS Belfast", 36),
  a("London Cable Car: Soar Over the Thames", 18, ["london cable car", "emirates air line"]),
  a("Royal Observatory Greenwich & Prime Meridian", 32, ["royal observatory greenwich", "royal observatory"]),
  a("Frameless – Immersive Art Experience", 42, ["frameless immersive art experience", "frameless"]),
  a("F1 DRIVE - London", 47, ["f1 drive"]),
  i("A Gin Tasting Journey Through Maritime Greenwich", 35),
  i("Fuller's Brewery Tour & Beer Tasting", 37, ["fullers brewery tour"]),
  i("Fish and Chips Lunch at The Seashell of Lisson Grove, Marylebone", 33),
  i("Traditional English Scone Making and Tea Workshop", 47),
  a("Jack The Ripper Walking Tour", 19),
  a("London Zoo", 52, ["zsl london zoo"]),
  i("The Chocolate Cocktail Club", 15),
  a("Changing of the Guard Walking Tour", 19),
  i("Pick & Cheese Conveyor Belt Cheese Experience in Camden", 33),
  a("Hampton Court Palace", 43),
  i("Timeless British Sweets & Tea at Henry's Kitchen (Hampton Court)", 15),
  a("Cutty Sark", 29),
  i("Classic Afternoon Sweet Treats at Bill's Greenwich", 11),
  i("Soho Comedy Factory", 19),
  a("The Chimney Lift at Battersea Power Station", 29, ["battersea power station chimney lift", "lift 109"]),
  a("Chelsea FC Stadium Tour & Museum", 45, ["chelsea fc stadium tour", "stamford bridge stadium tour"]),
  a("Museum of Illusions London", 39),
  a("Household Cavalry Museum", 15),
  i("Bicester Village Shopping Express Coach", 60),
  a("London Transport Museum", 36),
  i("Sipsmith Gin Distillery Tour and Tutored Tasting", 33, ["sipsmith gin distillery tour"]),
  a("Tottenham Hotspur Stadium Tour", 43),
  a("Royal Albert Hall Tour", 25),
  a("Royal Botanic Gardens, Kew", 29, ["kew gardens", "royal botanic gardens kew"]),
  a("The Paddington Bear Experience", 45, ["paddington bear experience"]),
  i("The Dilly Health Club Day Pass - Swimming Pool, Gym and Steam Room Usage", 35),
  a("Shakespeare's Globe Theatre Tour", 37, ["shakespeares globe", "shakespeares globe theatre", "globe theatre tour"]),
  a("The Fun Tour: Sightseeing with Live Theatre, Comedy & Music", 52),
  a("Churchill & World War 2 Walking Tour", 19),
  i("Blenheim Palace Day Trip with Admission", 92, ["blenheim palace day trip"]),
  i("Afternoon tea at Clarence Brasserie & Tea Room (Windsor)", 27),
  a("Twist Museum London", 37),
  a("Activate Oxford Street", 40),
  a("Flip Out Canary Wharf 2-Hour Experience", 23),
  a("Harry Potter Walking Tour", 23),
  a("Jason's Original Little Venice Canal Boat Trip", 25, ["jasons canal boat trip", "little venice canal boat trip"]),
  a("The Painted Hall at the Old Royal Naval College Greenwich", 25, ["painted hall greenwich", "old royal naval college"]),
  i("Lunch at Hard Rock Cafe London (Old Park Lane)", 37),
  a("London Bicycle Tour", 60),
  a("Crazy Golf - Swingers West End", 16, ["swingers west end"]),
  i("Wicked The Musical", 60, ["wicked the musical london", "wicked musical"]),
  a("The Dare Skywalk", 55, ["dare skywalk"]),
  a("London Food Tour of Soho & Covent Garden", 19),
  a("Notting Hill and Kensington Garden Walk with Royal Cream Tea", 79),
  a("Historic Pub Tour of London", 19),
  a("The Postal Museum", 27, ["postal museum"]),
  a("The Monument to the Great Fire of London", 9, ["the monument", "monument to the great fire"]),
  a("The Guards Museum", 15, ["guards museum"]),
  a("West End Unlocked: Shortcuts, Secrets and Sweet Treats", 79),
  a("The Courtauld Gallery", 16, ["courtauld gallery"]),
  a("Wembley Stadium Tour", 37),
  a("Camden Walking Tour", 19),
  a("Apsley House", 16),
  a("Wellington Arch", 10),
  a("Florence Nightingale Museum", 16),
  a("Beatles Walking Tour of Marylebone & Abbey Road", 23),
  a("London Bicycle Tour Company - Sunset Tour", 60),
  a("London Bicycle Tour Company - Bicycle Hire", 11),
  i("LEGOLAND Windsor Resort", 60, ["legoland windsor"]),
  a("Ice-skating at QUEENS", 22),
  i("Chessington World of Adventures Resort", 45, ["chessington world of adventures"]),
  a("Ramses and the Pharaohs' Gold: The Exhibition", 43),
  a("Solve a Mystery: the Murder at Trafalgar Square", 45),
  a("Golden Hinde", 8),
  a("Cartoon Museum", 16),
  a("Museum of Brands", 19),
  a("The Ultimate Game Vault – Bermondsey Bierkeller", 63),
  i("Windsor Hop-on Hop-off Bus Tour", 27),
  a("Solve A Mystery: the Murder at Buckingham Palace", 45),
  a("Highlights of Royal London Bike Tour", 56),
  a("Secrets of London Bike Tour: Thames, Tower Bridge & Market", 60),
  i("Stonehenge Half Day Tour", 79, ["stonehenge tour"]),
  i("Royal Pavilion, Brighton", 29, ["royal pavilion brighton"]),
  a("The Kia Oval Ground Tours", 29, ["kia oval tour"]),
  a("London Stadium Tour", 29),
  a("The Wernher Collection at Ranger's House", 16),
];

/**
 * All-Inclusive Pass prices in USD per adult, by consecutive days.
 * Explorer Pass prices in USD per adult, by number of attractions chosen.
 */
export const ALL_INCLUSIVE_PRICES_USD: Record<number, number> = {
  1: 142,
  2: 210,
  3: 269,
  4: 304,
  5: 331,
  6: 358,
  7: 385,
  10: 413,
};

export const EXPLORER_PRICES_USD: Record<number, number> = {
  2: 88,
  3: 121,
  4: 156,
  5: 183,
  6: 210,
  7: 223,
};

/**
 * All-Inclusive max credits (adult) by days. Go City publishes these in GBP (1 credit = £1 of gate
 * price); we convert at the GBP->USD ratio implied by Go City's own prices (e.g. London Eye
 * £39 -> $52, Tower of London £37 -> $49 ≈ 1.33).
 */
export const ALL_INCLUSIVE_MAX_CREDITS_GBP: Record<number, number> = {
  1: 305,
  2: 490,
  3: 670,
  4: 850,
  5: 1010,
  6: 1165,
  7: 1310,
  10: 1700,
};
export const GBP_TO_USD_GOCITY = 1.33;
