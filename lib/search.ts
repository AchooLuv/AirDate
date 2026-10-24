import { unstable_cache } from "next/cache";
import { findAnimeByTitle } from "@/lib/anime-index";
import { withCache } from "@/lib/cache";
import { REVALIDATE, SEARCH_LIMIT, SEARCH_MIN_LENGTH } from "@/lib/constants";
import { searchAniList } from "@/lib/providers/anilist";
import { searchDouban } from "@/lib/providers/douban";
import { searchSteam } from "@/lib/providers/steam";
import { searchTvmaze } from "@/lib/providers/tvmaze";
import type { Category, SearchResult } from "@/lib/types";

const CATEGORY_WEIGHT: Record<Category, number> = {
  movie: 1,
  series: 2,
  anime: 3,
  game: 4,
};

function normalize(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\-–—:：·・!！?？,，。.、'’"“”()（）\[\]【】《》<>/\\_]/g, "");
}

function quality(item: SearchResult): number {
  const genericSummary = item.summary?.includes("豆瓣条目");
  const dateScore =
    item.date === "1970-01-01"
      ? 0
      : item.dateLabel?.includes("放送") || item.dateLabel?.includes("发售")
        ? 3
        : 2;
  return (
    dateScore +
    (item.platforms.length ? 2 : 0) +
    (item.cover ? 1 : 0) +
    (item.summary && !genericSummary ? 2 : 0)
  );
}

function relevance(item: SearchResult, query: string): number {
  const q = normalize(query);
  const titles = [
    item.title,
    item.originalTitle,
    ...(item.keywords ?? []),
  ].filter((value): value is string => Boolean(value));

  let score = 0;
  for (const [index, title] of titles.entries()) {
    const normalized = normalize(title);
    const titleWeight = index === 0 ? 1 : 0.85;
    if (normalized === q) score = Math.max(score, 100 * titleWeight);
    else if (normalized.startsWith(q)) score = Math.max(score, 80 * titleWeight);
    else if (normalized.includes(q)) score = Math.max(score, 60 * titleWeight);
  }

  if (
    (item.keywords ?? []).some((keyword) => normalize(keyword) === q)
  ) {
    score += 25;
  }
  if (item.date !== "1970-01-01") score += 10;
  if (item.summary) score += 3;
  if (item.cover) score += 2;
  score += (5 - CATEGORY_WEIGHT[item.category]) * 0.5;
  return score;
}

async function loadSearch(rawQuery: string): Promise<SearchResult[]> {
  const query = rawQuery.trim().slice(0, 80);
  if (query.length < SEARCH_MIN_LENGTH) return [];

  return withCache(`search:all:v11:${query.toLowerCase()}`, REVALIDATE.search, async () => {
    const settled = await Promise.allSettled([
      searchDouban(query),
      searchTvmaze(query),
      searchAniList(query),
      searchSteam(query),
    ]);

    const all = settled
      .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
      .map((item) => {
        // Douban's autocomplete labels TV anime as movies. Re-classify against
        // the local Bangumi index so it joins the anime lane.
        if (item.category === "movie" && findAnimeByTitle(item.title)) {
          return { ...item, category: "anime" as const, badge: "番剧" };
        }
        return item;
      });

    const uniqueByKey = new Map<string, SearchResult>();
    for (const item of all) {
      const key = `${item.category}:${normalize(item.title)}`;
      const existing = uniqueByKey.get(key);
      if (!existing || quality(item) > quality(existing)) {
        uniqueByKey.set(key, item);
      }
    }
    const unique = [...uniqueByKey.values()];

    return unique
      .sort((left, right) => relevance(right, query) - relevance(left, query))
      .slice(0, SEARCH_LIMIT)
      .map((item) => ({
        ...item,
        sourceLabel: item.source.name,
      }));
  });
}

const getCachedSearch = unstable_cache(loadSearch, ["airdate-search-v1"], {
  revalidate: REVALIDATE.search,
  tags: ["search"],
});

export async function searchAll(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim().slice(0, 80);
  if (trimmed.length < SEARCH_MIN_LENGTH) return [];
  return getCachedSearch(trimmed);
}
