/** Shared UI story type used across homepage section components. */
export interface Story {
  title: string;
  description?: string;
  href: string;
  imageUrl?: string;
  timeAgo?: string;
  category?: string;
  categoryKey?: string;
  readingTime?: string;
  sourceLabel?: string;
}

/** Minimal story subset for trending/sidebar lists. */
export type TrendingItem = Pick<Story, "title" | "href" | "category" | "timeAgo">;

/** Minimal story subset for just-in feed. */
export type FeedItem = Pick<Story, "title" | "href" | "category"> & {
  timeAgo: string; // required, not optional
};
