/**
 * BBC-style category / subcategory system for Plata.
 *
 * Top-level categories appear in the main navigation bar.
 * Subcategories are used as article labels (like BBC's "US & Canada", "Europe", etc.)
 */

export const CATEGORIES = {
  politics: "Politics",
  economy: "Economy",
  world: "World",
} as const;

export type Category = keyof typeof CATEGORIES;
export const CATEGORY_LIST = Object.keys(CATEGORIES) as Category[];

/** Subcategories keyed by parent category */
export const SUBCATEGORIES: Record<Category, Record<string, string>> = {
  politics: {
    government: "Government",
    congress: "Congress",
    provinces: "Provinces",
    justice: "Justice",
  },
  economy: {
    markets: "Markets",
    trade: "Trade",
    energy: "Energy",
    agriculture: "Agriculture",
    labor: "Labor",
  },
  world: {
    "latin-america": "Latin America",
    europe: "Europe",
    "us-canada": "US & Canada",
    asia: "Asia",
  },
} as const;

export type Subcategory = string;
