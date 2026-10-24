export const CATEGORIES = ["movie", "series", "anime", "game"] as const;

export type Category = (typeof CATEGORIES)[number];

export type CategoryCounts = Record<Category, number>;

export type ReleaseItem = {
  id: string;
  category: Category;
  title: string;
  originalTitle?: string;
  summary?: string;
  cover?: string;
  /** Local date in Asia/Shanghai, formatted as YYYY-MM-DD. */
  date: string;
  /** Local time in Asia/Shanghai, formatted as HH:mm. Undefined for all-day items. */
  time?: string;
  /** Original instant, when the source provides one. */
  startsAt?: string;
  platforms: string[];
  region?: string;
  director?: string;
  developer?: string;
  studio?: string;
  price?: string;
  episode?: string;
  score?: number;
  badge?: string;
  genres?: string[];
  source: {
    name: string;
    url: string;
  };
};

export type SourceStatus = {
  name: string;
  status: "ok" | "empty" | "error";
  count: number;
  ms: number;
  note?: string;
};

export type DayData = {
  date: string;
  timezone: "Asia/Shanghai";
  generatedAt: string;
  counts: CategoryCounts;
  total: number;
  items: ReleaseItem[];
  upcoming: ReleaseItem[];
  sources: SourceStatus[];
};

export type SearchResult = ReleaseItem & {
  dateLabel?: string;
  sourceLabel?: string;
  /** Alternate titles used only for search relevance. */
  keywords?: string[];
};

export type ApiError = {
  error: string;
};
