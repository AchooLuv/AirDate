import { unstable_cache } from "next/cache";
import { withCache } from "@/lib/cache";
import { REVALIDATE } from "@/lib/constants";
import { addDays, timeInShanghai, toShanghaiKey, todayKey } from "@/lib/date";
import { proxiedCover } from "@/lib/format";
import { fetchJson, stripHtml, truncate, uniqueStrings } from "@/lib/http";
import type { ReleaseItem, SearchResult } from "@/lib/types";

type TvMazeImage = { medium?: string; original?: string } | null;

type TvMazeCountry = { name?: string; code?: string; timezone?: string } | null;

type TvMazeShow = {
  id: number;
  name: string;
  type?: string;
  language?: string;
  genres?: string[];
  status?: string;
  premiered?: string | null;
  rating?: { average?: number | null } | null;
  network?: { name?: string; country?: TvMazeCountry } | null;
  webChannel?: { name?: string; country?: TvMazeCountry } | null;
  image?: TvMazeImage;
  summary?: string | null;
  url?: string;
  _links?: {
    nextepisode?: { href?: string };
  };
};

type TvMazeEpisode = {
  id: number;
  name?: string;
  season?: number;
  number?: number | null;
  type?: string;
  airdate?: string;
  airstamp?: string;
  airtime?: string;
  runtime?: number | null;
  summary?: string | null;
  image?: TvMazeImage;
  url?: string;
  show?: TvMazeShow;
};

const ALLOWED_TYPES = new Set([
  "Scripted",
  "Animation",
  "Documentary",
  "Children",
  "Adult",
]);

const STATUS_LABELS: Record<string, string> = {
  Running: "连载中",
  Ended: "已完结",
  "To Be Determined": "待定",
  "In Development": "开发中",
};

function networkOf(show: TvMazeShow): string | undefined {
  return show.network?.name || show.webChannel?.name || undefined;
}

function regionOf(show: TvMazeShow): string | undefined {
  return show.network?.country?.name || show.webChannel?.country?.name || undefined;
}

function episodeCode(episode: TvMazeEpisode): string | undefined {
  if (episode.season == null || episode.number == null) return undefined;
  return `S${String(episode.season).padStart(2, "0")}E${String(episode.number).padStart(2, "0")}`;
}

function mapEpisode(episode: TvMazeEpisode): ReleaseItem | null {
  const show = episode.show;
  if (!show) return null;
  if (show.type && !ALLOWED_TYPES.has(show.type)) return null;
  if (!episode.airstamp && !episode.airdate) return null;

  const date = episode.airstamp
    ? toShanghaiKey(episode.airstamp)
    : episode.airdate!;
  const time = episode.airstamp
    ? timeInShanghai(episode.airstamp)
    : episode.airtime || undefined;

  const code = episodeCode(episode);
  const episodeName = episode.name ? truncate(episode.name, 80) : "";
  const badge = code ? `${code} 更新` : "更新";
  const summary =
    stripHtml(episode.summary) ||
    stripHtml(show.summary) ||
    `${show.name} 更新${code ? ` ${code}` : ""}。`;

  return {
    id: `tvmaze-episode-${episode.id}`,
    category: "series",
    title: show.name,
    summary,
    cover: proxiedCover(episode.image?.original || show.image?.original),
    date,
    time,
    startsAt: episode.airstamp,
    platforms: uniqueStrings([networkOf(show), "电视"]),
    region: regionOf(show),
    episode: code
      ? `${code}${episodeName ? ` · ${episodeName}` : ""}`
      : episodeName || undefined,
    score: show.rating?.average ?? undefined,
    badge,
    genres: show.genres?.slice(0, 3),
    source: {
      name: "TVMaze",
      url: episode.url || show.url || `https://www.tvmaze.com/shows/${show.id}`,
    },
  };
}

async function scheduleFor(date: string, web: boolean): Promise<TvMazeEpisode[]> {
  const url = web
    ? `https://api.tvmaze.com/schedule/web?date=${date}`
    : `https://api.tvmaze.com/schedule?date=${date}&country=US`;
  return fetchJson<TvMazeEpisode[]>(url, {
    revalidate: REVALIDATE.tvmaze,
    tags: ["schedule", "tvmaze"],
    timeoutMs: 8_000,
  });
}

async function loadTvmazeEpisodes(dateKey: string): Promise<ReleaseItem[]> {
  return withCache(`tvmaze:day:v4:${dateKey}`, REVALIDATE.tvmaze, async () => {
    const dates = [addDays(dateKey, -1), dateKey];
    const requests = dates.flatMap((date) => [
      scheduleFor(date, false),
      scheduleFor(date, true),
    ]);

    const settled = await Promise.allSettled(requests);
    const seen = new Set<number>();
    const items: ReleaseItem[] = [];

    for (const result of settled) {
      if (result.status !== "fulfilled") continue;
      for (const episode of result.value) {
        if (seen.has(episode.id)) continue;
        seen.add(episode.id);
        const mapped = mapEpisode(episode);
        if (!mapped || mapped.date !== dateKey) continue;
        items.push(mapped);
      }
    }

    return items.sort((a, b) => {
      const left = a.startsAt ?? `${a.date}T${a.time ?? "00:00"}:00+08:00`;
      const right = b.startsAt ?? `${b.date}T${b.time ?? "00:00"}:00+08:00`;
      return left.localeCompare(right);
    });
  });
}

const getCachedTvmazeEpisodes = unstable_cache(
  loadTvmazeEpisodes,
  ["tvmaze-day-v1"],
  { revalidate: REVALIDATE.tvmaze, tags: ["schedule", "tvmaze"] },
);

export async function getTvmazeEpisodes(dateKey: string): Promise<ReleaseItem[]> {
  return getCachedTvmazeEpisodes(dateKey);
}

type TvMazeSearchResult = {
  score: number;
  show: TvMazeShow;
};

export async function searchTvmaze(query: string): Promise<SearchResult[]> {
  return withCache(`tvmaze:search:v2:${query.toLowerCase()}`, REVALIDATE.search, async () => {
    const results = await fetchJson<TvMazeSearchResult[]>(
      `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`,
      {
        revalidate: REVALIDATE.search,
        tags: ["search", "tvmaze"],
        timeoutMs: 7_000,
      },
    );

    return results.slice(0, 6).map(({ show }) => {
      const network = networkOf(show);
      return {
        id: `tvmaze-show-${show.id}`,
        category: "series",
        title: show.name,
        summary: stripHtml(show.summary) || "TVMaze 剧集条目。",
        cover: proxiedCover(show.image?.original),
        date: show.premiered || todayKey(),
        dateLabel: show.premiered
          ? `首播 ${show.premiered}`
          : STATUS_LABELS[show.status ?? ""] ?? "档期待定",
        platforms: network ? [network] : [],
        region: regionOf(show),
        score: show.rating?.average ?? undefined,
        badge: STATUS_LABELS[show.status ?? ""] ?? "剧集",
        genres: show.genres?.slice(0, 3),
        source: {
          name: "TVMaze",
          url: show.url || `https://www.tvmaze.com/shows/${show.id}`,
        },
      } satisfies SearchResult;
    });
  });
}
