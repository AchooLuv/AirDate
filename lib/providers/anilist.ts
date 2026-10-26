import { unstable_cache } from "next/cache";
import {
  findAnimeById,
  findAnimeByTitle,
  searchAnimeRecords,
  type AnimeIndexRecord,
} from "@/lib/anime-index";
import { withCache } from "@/lib/cache";
import { REVALIDATE, SOURCE_CONTACT } from "@/lib/constants";
import { dayUnixRange, toShanghaiKey, timeInShanghai } from "@/lib/date";
import { proxiedCover, truncateText } from "@/lib/format";
import { fetchJson, stripHtml, uniqueStrings } from "@/lib/http";
import type { ReleaseItem, SearchResult } from "@/lib/types";

type AniListMedia = {
  id: number;
  title?: {
    romaji?: string | null;
    native?: string | null;
    english?: string | null;
  };
  coverImage?: { extraLarge?: string; large?: string; color?: string } | null;
  description?: string | null;
  siteUrl?: string;
  format?: string;
  popularity?: number;
  averageScore?: number | null;
  genres?: string[];
  externalLinks?: Array<{ site?: string; url?: string; type?: string }>;
  nextAiringEpisode?: { airingAt?: number; episode?: number } | null;
  startDate?: { year?: number; month?: number; day?: number } | null;
};

type AniSchedule = {
  airingAt: number;
  episode: number;
  media: AniListMedia;
};

type AniListPage = {
  data?: {
    Page?: {
      pageInfo?: { hasNextPage?: boolean };
      airingSchedules?: AniSchedule[];
      media?: AniListMedia[];
    };
  };
  errors?: Array<{ message?: string }>;
};

const ANILIST_ENDPOINT = "https://graphql.anilist.co";

const SCHEDULE_QUERY = `
  query ($from: Int, $to: Int, $page: Int) {
    Page(page: $page, perPage: 50) {
      pageInfo { hasNextPage }
      airingSchedules(airingAt_greater: $from, airingAt_lesser: $to) {
        airingAt
        episode
        media {
          id
          title { romaji native english }
          coverImage { extraLarge large color }
          description
          siteUrl
          format
          popularity
          averageScore
          genres
          externalLinks { site url type }
        }
      }
    }
  }
`;

const SEARCH_QUERY = `
  query ($q: String) {
    Page(page: 1, perPage: 8) {
      media(search: $q, type: ANIME, sort: SEARCH_MATCH) {
        id
        title { romaji native english }
        coverImage { extraLarge large color }
        description
        siteUrl
        format
        popularity
        averageScore
        genres
        externalLinks { site url type }
        nextAiringEpisode { airingAt episode }
        startDate { year month day }
      }
    }
  }
`;

const BY_IDS_QUERY = `
  query ($ids: [Int]) {
    Page(page: 1, perPage: 20) {
      media(id_in: $ids, type: ANIME) {
        id
        title { romaji native english }
        coverImage { extraLarge large color }
        description
        siteUrl
        format
        popularity
        averageScore
        genres
        externalLinks { site url type }
        nextAiringEpisode { airingAt episode }
        startDate { year month day }
      }
    }
  }
`;

function findRecord(media: AniListMedia): AnimeIndexRecord | undefined {
  const byId = findAnimeById(media.id);
  if (byId) return byId;

  for (const title of [media.title?.native, media.title?.romaji, media.title?.english]) {
    const record = findAnimeByTitle(title);
    if (record) return record;
  }
  return undefined;
}

async function anilistRequest<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const payload = await fetchJson<AniListPage>(ANILIST_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": `AirDate/1.0 (${SOURCE_CONTACT})`,
    },
    body: JSON.stringify({ query, variables }),
    timeoutMs: 9_000,
  });

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join("; "));
  }
  return payload as T;
}

function formatLabel(format: string | undefined): string {
  const labels: Record<string, string> = {
    TV: "TV 动画",
    TV_SHORT: "短篇动画",
    ONA: "网络动画",
    OVA: "OVA",
    MOVIE: "剧场版",
    SPECIAL: "特别篇",
    MUSIC: "音乐",
  };
  return (format && labels[format]) || "动画";
}

function platformsOf(media: AniListMedia, record?: AnimeIndexRecord): string[] {
  if (record?.p?.length) return record.p.slice(0, 3);

  const streaming = (media.externalLinks ?? [])
    .filter((link) => link.type === "STREAMING" && link.site)
    .map((link) => link.site as string);
  return uniqueStrings([...streaming.slice(0, 3), "日本放送"]).slice(0, 3);
}

function mediaTitle(
  media: AniListMedia,
  record?: AnimeIndexRecord,
): { title: string; originalTitle?: string } {
  const native = media.title?.native || undefined;
  const romaji = media.title?.romaji || undefined;
  const english = media.title?.english || undefined;
  const title = record?.z || record?.t || native || english || romaji || "未命名动画";
  const original = native || record?.t || romaji || english;
  return {
    title,
    originalTitle: original && original !== title ? original : undefined,
  };
}

function mediaSummary(media: AniListMedia): string {
  return truncateText(stripHtml(media.description), 420);
}

async function loadAnimeForDay(dateKey: string): Promise<ReleaseItem[]> {
  return withCache(`anilist:day:v7:${dateKey}`, REVALIDATE.anime, async () => {
    const { from, to } = dayUnixRange(dateKey);
    const schedules: AniSchedule[] = [];

    for (let page = 1; page <= 4; page += 1) {
      const response = await anilistRequest<AniListPage>(SCHEDULE_QUERY, {
        from: from - 1,
        to,
        page,
      });
      const pageData = response.data?.Page;
      schedules.push(...(pageData?.airingSchedules ?? []));
      if (!pageData?.pageInfo?.hasNextPage || schedules.length >= 200) break;
    }

    const seen = new Set<number>();
    const items: ReleaseItem[] = [];

    for (const schedule of schedules) {
      const media = schedule.media;
      if (!media || seen.has(media.id)) continue;
      if (media.format === "MUSIC") continue;
      seen.add(media.id);

      const shanghaiDate = toShanghaiKey(schedule.airingAt * 1_000);
      if (shanghaiDate !== dateKey) continue;

      const record = findRecord(media);
      const { title, originalTitle } = mediaTitle(media, record);
      const episodeLabel = `第 ${schedule.episode} 话`;
      const format = formatLabel(media.format);

      items.push({
        id: `anilist-${media.id}-${schedule.episode}`,
        category: "anime",
        title,
        originalTitle,
        summary: mediaSummary(media),
        cover: proxiedCover(
          media.coverImage?.extraLarge || media.coverImage?.large,
        ),
        date: shanghaiDate,
        time: timeInShanghai(schedule.airingAt * 1_000),
        startsAt: new Date(schedule.airingAt * 1_000).toISOString(),
        platforms: platformsOf(media, record),
        region: "日本",
        badge: `${format} · ${episodeLabel}`,
        episode: episodeLabel,
        score: media.averageScore ? media.averageScore / 10 : undefined,
        genres: media.genres?.slice(0, 3),
        source: {
          name: "AniList",
          url: media.siteUrl || `https://anilist.co/anime/${media.id}`,
        },
      });
    }

    return items.sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? ""));
  });
}

const getCachedAnimeForDay = unstable_cache(
  loadAnimeForDay,
  ["anilist-day-v2"],
  { revalidate: REVALIDATE.anime, tags: ["schedule", "anilist"] },
);

export async function getAnimeForDay(dateKey: string): Promise<ReleaseItem[]> {
  return getCachedAnimeForDay(dateKey);
}

function startDateKey(media: AniListMedia): string | undefined {
  const start = media.startDate;
  if (!start?.year) return undefined;
  return `${start.year}-${String(start.month ?? 1).padStart(2, "0")}-${String(
    start.day ?? 1,
  ).padStart(2, "0")}`;
}

function searchResultFromMedia(media: AniListMedia): SearchResult {
  const record = findRecord(media);
  const { title, originalTitle } = mediaTitle(media, record);
  const english = media.title?.english || record?.e;
  const next = media.nextAiringEpisode;
  const nextDate = next?.airingAt ? toShanghaiKey(next.airingAt * 1_000) : undefined;
  const premiere = startDateKey(media);
  const date = nextDate || premiere || record?.b || "1970-01-01";
  const dateLabel = nextDate
    ? `下次放送 ${nextDate}${next?.episode ? ` · 第 ${next.episode} 话` : ""}`
    : premiere
      ? `首播 ${premiere}`
      : record?.b
        ? `首播 ${record.b}`
        : "放送时间待定";

  return {
    id: `anilist-search-${media.id}`,
    category: "anime",
    title,
    originalTitle,
    summary: mediaSummary(media) || "AniList 番剧条目，点击查看详情。",
    cover: proxiedCover(media.coverImage?.extraLarge || media.coverImage?.large),
    date,
    dateLabel,
    platforms: platformsOf(media, record),
    region: "日本",
    score: media.averageScore ? media.averageScore / 10 : undefined,
    badge: formatLabel(media.format),
    genres: media.genres?.slice(0, 3),
    keywords: [media.title?.native, media.title?.romaji, english, record?.t, record?.e].filter(
      (value): value is string => Boolean(value),
    ),
    source: {
      name: "AniList",
      url: media.siteUrl || `https://anilist.co/anime/${media.id}`,
    },
  };
}

function localRecordResult(record: AnimeIndexRecord): SearchResult {
  const title = record.z || record.t;
  return {
    id: `bangumi-search-${record.a}`,
    category: "anime",
    title,
    originalTitle: record.t !== title ? record.t : undefined,
    summary: "Bangumi 中文索引收录的番剧，点击前往 AniList 查看详情。",
    date: record.b || "1970-01-01",
    dateLabel: record.b ? `首播 ${record.b}` : "放送时间待定",
    platforms: record.p ?? [],
    region: "日本",
    badge: "番剧",
    keywords: [record.t, record.e].filter(
      (value): value is string => Boolean(value),
    ),
    source: {
      name: "AniList · 本地索引",
      url: `https://anilist.co/anime/${record.a}`,
    },
  };
}

export async function searchAniList(query: string): Promise<SearchResult[]> {
  return withCache(`anilist:search:v8:${query.toLowerCase()}`, REVALIDATE.search, async () => {
    // AniList's text search does not index Chinese titles, so resolve Chinese
    // queries through the local Bangumi index first, then hydrate via id_in.
    const local = searchAnimeRecords(query, 10);
    if (local.length) {
      try {
        const ids = local
          .map((record) => Number(record.a))
          .filter((id) => Number.isFinite(id));
        const response = await anilistRequest<AniListPage>(BY_IDS_QUERY, { ids });
        const mediaById = new Map(
          (response.data?.Page?.media ?? []).map((media) => [media.id, media]),
        );
        const ordered = local
          .map((record) => mediaById.get(Number(record.a)))
          .filter((media): media is AniListMedia => Boolean(media));

        if (ordered.length) return ordered.map(searchResultFromMedia);
      } catch {
        return local.map(localRecordResult);
      }
    }

    const response = await anilistRequest<AniListPage>(SEARCH_QUERY, { q: query });
    return (response.data?.Page?.media ?? []).map(searchResultFromMedia);
  });
}
