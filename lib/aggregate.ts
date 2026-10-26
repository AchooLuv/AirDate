import { unstable_cache } from "next/cache";
import { getAnimeForDay } from "@/lib/providers/anilist";
import { getDoubanMovies, getDoubanSeries } from "@/lib/providers/douban";
import { getSteamGames } from "@/lib/providers/steam";
import { getTvmazeEpisodes } from "@/lib/providers/tvmaze";
import type {
  Category,
  CategoryCounts,
  DayData,
  ReleaseItem,
  SourceStatus,
} from "@/lib/types";

const CATEGORY_ORDER: Record<Category, number> = {
  movie: 0,
  series: 1,
  anime: 2,
  game: 3,
};

function timeMinutes(item: ReleaseItem): number {
  if (!item.time) return -1;
  const [hours, minutes] = item.time.split(":").map(Number);
  return hours * 60 + minutes;
}

function sortItems(items: ReleaseItem[]): ReleaseItem[] {
  return items.sort((left, right) => {
    if (left.date !== right.date) return left.date.localeCompare(right.date);
    const leftMinutes = timeMinutes(left);
    const rightMinutes = timeMinutes(right);
    if (leftMinutes !== rightMinutes) return leftMinutes - rightMinutes;
    if (left.category !== right.category) {
      return CATEGORY_ORDER[left.category] - CATEGORY_ORDER[right.category];
    }
    return left.title.localeCompare(right.title, "zh-Hans-CN");
  });
}

function normalizeKey(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\-–—:：·・!！?？,，。.、'’"“”()（）\[\]【】《》<>/\\_]/g, "")
    .trim();
}

function dedupe(items: ReleaseItem[]): ReleaseItem[] {
  const byId = new Set<string>();
  const byTitle = new Map<string, ReleaseItem>();
  const result: ReleaseItem[] = [];

  for (const item of items) {
    if (byId.has(item.id)) continue;
    byId.add(item.id);

    const key = `${item.category}:${normalizeKey(item.title)}`;
    const existing = byTitle.get(key);
    if (!existing) {
      byTitle.set(key, item);
      result.push(item);
      continue;
    }

    // Prefer the record that carries a concrete broadcast time and richer data.
    const existingRank =
      (existing.source.name.includes("AniList") ? 4 : 0) +
      (existing.time ? 2 : 0) +
      (existing.summary ? 1 : 0);
    const itemRank =
      (item.source.name.includes("AniList") ? 4 : 0) +
      (item.time ? 2 : 0) +
      (item.summary ? 1 : 0);

    if (itemRank > existingRank) {
      const index = result.indexOf(existing);
      if (index >= 0) result[index] = item;
      byTitle.set(key, item);
    }
  }

  return result;
}

function pickUpcoming(allKnown: ReleaseItem[], dateKey: string, limit = 9): ReleaseItem[] {
  const future = sortItems(allKnown.filter((item) => item.date > dateKey));
  const picked: ReleaseItem[] = [];
  const seen = new Set<string>();
  const counts: CategoryCounts = { movie: 0, series: 0, anime: 0, game: 0 };

  // First pass: one from every lane, so the preview always shows all four
  // content types. Second pass adds the nearest runner-up from each lane.
  for (const cap of [1, 2]) {
    for (const item of future) {
      if (picked.length >= limit) break;
      const key = `${item.category}:${normalizeKey(item.title)}`;
      if (seen.has(key) || counts[item.category] >= cap) continue;
      picked.push(item);
      seen.add(key);
      counts[item.category] += 1;
    }
  }

  for (const item of future) {
    if (picked.length >= limit) break;
    const key = `${item.category}:${normalizeKey(item.title)}`;
    if (seen.has(key)) continue;
    picked.push(item);
    seen.add(key);
  }

  return sortItems(picked).slice(0, limit);
}

function makeCounts(items: ReleaseItem[]): CategoryCounts {
  const counts: CategoryCounts = { movie: 0, series: 0, anime: 0, game: 0 };
  for (const item of items) counts[item.category] += 1;
  return counts;
}

type Settled<T> = PromiseSettledResult<T>;

function statusFor(
  name: string,
  settled: Settled<ReleaseItem[]>,
  dayItems: ReleaseItem[],
  startedAt: number,
  note?: string,
  available?: number,
): SourceStatus {
  const count = dayItems.filter((item) => item.source.name.includes(name)).length;
  const ms = Date.now() - startedAt;
  if (settled.status === "rejected") {
    return {
      name,
      status: "error",
      count: 0,
      available: 0,
      ms,
      note: settled.reason instanceof Error ? settled.reason.message : "数据源暂时不可用",
    };
  }
  const total = available ?? settled.value.length;
  return {
    name,
    status: total > 0 ? "ok" : "empty",
    count,
    available: total,
    ms,
    note,
  };
}

async function loadDayData(dateKey: string): Promise<DayData> {
  const timings = {
    douban: Date.now(),
    tvmaze: Date.now(),
    anime: Date.now(),
    steam: Date.now(),
  };

  const [doubanMovies, doubanSeries, tvmaze, anime, games] = await Promise.allSettled([
    getDoubanMovies(),
    getDoubanSeries(),
    getTvmazeEpisodes(dateKey),
    getAnimeForDay(dateKey),
    getSteamGames(),
  ]);

  const movies = doubanMovies.status === "fulfilled" ? doubanMovies.value : [];
  const series =
    doubanSeries.status === "fulfilled"
      ? doubanSeries.value.filter((item) => item.category === "series")
      : [];
  const doubanAnime =
    doubanSeries.status === "fulfilled"
      ? doubanSeries.value.filter((item) => item.category === "anime")
      : [];
  const episodes = tvmaze.status === "fulfilled" ? tvmaze.value : [];
  const animeItems = anime.status === "fulfilled" ? anime.value : [];
  const gameItems = games.status === "fulfilled" ? games.value : [];

  const allKnown = dedupe([
    ...movies,
    ...series,
    ...episodes,
    ...animeItems,
    ...doubanAnime,
    ...gameItems,
  ]);

  const items = sortItems(allKnown.filter((item) => item.date === dateKey));
  const upcoming = pickUpcoming(allKnown, dateKey);
  const counts = makeCounts(items);

  const doubanSettled: Settled<ReleaseItem[]> =
    doubanMovies.status === "fulfilled" || doubanSeries.status === "fulfilled"
      ? {
          status: "fulfilled",
          value: [...movies, ...series, ...doubanAnime],
        }
      : {
          status: "rejected",
          reason:
            doubanMovies.status === "rejected" ? doubanMovies.reason : doubanSeries.reason,
        };

  const sourceStatuses: SourceStatus[] = [
    statusFor(
      "豆瓣",
      doubanSettled,
      items,
      timings.douban,
      "电影 · 剧集 · 番剧首播",
      movies.length + series.length + doubanAnime.length,
    ),
    statusFor("TVMaze", tvmaze, items, timings.tvmaze, "北美电视网与流媒体", episodes.length),
    statusFor("AniList", anime, items, timings.anime, "AniList 放送表 · 本地中文索引", animeItems.length),
    statusFor("Steam", games, items, timings.steam, "国区即将发售与新作", gameItems.length),
  ];

  return {
    date: dateKey,
    timezone: "Asia/Shanghai",
    generatedAt: new Date().toISOString(),
    counts,
    total: items.length,
    items,
    upcoming,
    sources: sourceStatuses,
  };
}

const DEGRADED_DAY = "DEGRADED_DAY";

async function loadDayDataForCache(dateKey: string): Promise<DayData> {
  const data = await loadDayData(dateKey);
  if (data.total === 0 && data.sources.some((source) => source.status === "error")) {
    // A transient upstream outage should not pin an empty day for five minutes.
    throw new Error(DEGRADED_DAY);
  }
  return data;
}

const getCachedDayData = unstable_cache(loadDayDataForCache, ["airdate-day-v3"], {
  revalidate: 300,
  tags: ["schedule"],
});

export async function getDayData(dateKey: string): Promise<DayData> {
  try {
    return await getCachedDayData(dateKey);
  } catch (error) {
    if (error instanceof Error && error.message.includes(DEGRADED_DAY)) {
      return loadDayData(dateKey);
    }
    throw error;
  }
}

export function emptyDayData(dateKey: string): DayData {
  return {
    date: dateKey,
    timezone: "Asia/Shanghai",
    generatedAt: new Date().toISOString(),
    counts: { movie: 0, series: 0, anime: 0, game: 0 },
    total: 0,
    items: [],
    upcoming: [],
    sources: [],
  };
}
