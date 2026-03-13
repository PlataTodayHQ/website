export const CATEGORIES = {
  politics: "Politics",
  economy: "Economy",
  sports: "Sports",
  culture: "Culture",
  world: "World",
} as const;

export type Category = keyof typeof CATEGORIES;
export const CATEGORY_LIST = Object.keys(CATEGORIES) as Category[];
