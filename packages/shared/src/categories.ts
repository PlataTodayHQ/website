/**
 * BBC-style category / subcategory system for Plata.
 *
 * Top-level categories appear in the main navigation bar.
 * Subcategories are used as article labels (like BBC's "US & Canada", "Europe", etc.)
 */

export const CATEGORIES = {
  politics: "Politics",
  economy: "Economy",
  sports: "Sports",
  society: "Society",
  culture: "Culture",
  world: "World",
  science: "Science & Tech",
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
  sports: {
    football: "Football",
    rugby: "Rugby",
    tennis: "Tennis",
    motorsport: "Motorsport",
  },
  society: {
    education: "Education",
    health: "Health",
    immigration: "Immigration",
    urban: "Urban",
  },
  culture: {
    arts: "Arts",
    tourism: "Tourism",
    "food-wine": "Food & Wine",
    film: "Film",
  },
  world: {
    "latin-america": "Latin America",
    europe: "Europe",
    "us-canada": "US & Canada",
    asia: "Asia",
  },
  science: {
    innovation: "Innovation",
    environment: "Environment",
    digital: "Digital",
    space: "Space",
  },
} as const;

export type Subcategory = string;
