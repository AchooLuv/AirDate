import { withCache } from "@/lib/cache";
import { REVALIDATE } from "@/lib/constants";
import { isValidDateKey } from "@/lib/date";
import { proxiedCover } from "@/lib/format";
import { fetchJson, stripHtml, uniqueStrings } from "@/lib/http";
import type { Category, ReleaseItem, SearchResult } from "@/lib/types";

const DOUBAN_HEADERS = {
  Referer: "https://movie.douban.com/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

type DoubanSubject = {
  id: string;
  title: string;
  original_title?: string | null;
  intro?: string | null;
  cover_url?: string | null;
  pic?: { large?: string; normal?: string } | null;
  url?: string;
  release_date?: string | null;
  pubdate?: string[] | null;
  year?: string;
  card_subtitle?: string;
  genres?: string[];
  directors?: Array<{ name?: string }>;
  actors?: Array<{ name?: string }>;
  vendor_icons?: string[];
  rating?: { value?: number; count?: number } | null;
  is_released?: boolean;
  type?: string;
  subtype?: string;
  wish_count?: number;
};

type DoubanList = {
  total: number;
  count?: number;
  subjects?: DoubanSubject[];
};

const VENDOR_LABELS: Record<string, string> = {
  netflix: "Netflix",
  tencent: "腾讯视频",
  "tencent video": "腾讯视频",
  iqiyi: "爱奇艺",
  youku: "优酷",
  bilibili: "哔哩哔哩",
  mgtv: "芒果 TV",
  bbc: "BBC",
  nhk: "NHK",
  hbo: "HBO Max",
  "hbo max": "Max",
  max: "Max",
  disney: "Disney+",
  "disney+": "Disney+",
  apple: "Apple TV+",
  "apple tv": "Apple TV+",
  "apple tv+": "Apple TV+",
  prime: "Prime Video",
  amazon: "Prime Video",
  "prime video": "Prime Video",
  paramount: "Paramount+",
  hulu: "Hulu",
  showtime: "Showtime",
  starz: "Starz",
  peacock: "Peacock",
  crunchyroll: "Crunchyroll",
  "viu": "Viu",
  "wowow": "WOWOW",
  "fuji tv": "富士电视台",
  "tokyo mx": "TOKYO MX",
};

function vendorName(iconUrl: string): string {
  const file = iconUrl.split("/").pop()?.split("?")[0] ?? "";
  const stem = file.replace(/\.(png|svg|webp)$/i, "");
  const normalized = stem.toLowerCase().replace(/[-_]/g, " ").trim();
  return (
    VENDOR_LABELS[normalized] ??
    stem
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

function parsePubdate(subject: DoubanSubject): { date: string; region?: string } | null {
  const candidates = [subject.release_date, ...(subject.pubdate ?? [])];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const match = candidate.match(/(\d{4}-\d{2}-\d{2})/);
    if (!match || !isValidDateKey(match[1])) continue;
    const regionMatch = candidate.match(/\(([^)]+)\)/);
    return {
      date: match[1],
      region: regionMatch?.[1]?.trim(),
    };
  }
  return null;
}

function directors(subject: DoubanSubject): string | undefined {
  const names = (subject.directors ?? [])
    .map((person) => person.name)
    .filter((name): name is string => Boolean(name));
  return names.length ? names.slice(0, 2).join(" / ") : undefined;
}

function summaryOf(subject: DoubanSubject): string {
  const intro = stripHtml(subject.intro);
  if (intro) return intro;
  const subtitle = subject.card_subtitle ?? "";
  return subtitle;
}

function scoreOf(subject: DoubanSubject): number | undefined {
  const value = subject.rating?.value;
  return value && value > 0 ? value : undefined;
}

function baseItem(
  subject: DoubanSubject,
  category: Category,
  date: string,
  region: string | undefined,
): ReleaseItem {
  const vendors = uniqueStrings((subject.vendor_icons ?? []).map(vendorName));
  const isAnimation = (subject.genres ?? []).includes("动画");
  const platforms =
    category === "movie"
      ? uniqueStrings(["院线", ...vendors]).slice(0, 3)
      : vendors.length
        ? vendors.slice(0, 3)
        : ["平台待定"];

  const originalTitle =
    subject.original_title && subject.original_title !== subject.title
      ? subject.original_title
      : undefined;

  return {
    id: `douban-${category}-${subject.id}`,
    category,
    title: subject.title,
    originalTitle,
    summary: summaryOf(subject),
    cover: proxiedCover(subject.cover_url || subject.pic?.large),
    date,
    platforms,
    region,
    director: directors(subject),
    score: scoreOf(subject),
    badge: category === "movie" ? "定档" : isAnimation ? "动画首播" : "首播",
    genres: subject.genres?.slice(0, 3),
    source: {
      name: "豆瓣",
      url: subject.url || `https://movie.douban.com/subject/${subject.id}/`,
    },
  };
}

async function doubanList(path: string, start = 0, count = 50): Promise<DoubanList> {
  return fetchJson<DoubanList>(
    `https://m.douban.com/rexxar/api/v2/${path}?start=${start}&count=${count}`,
    {
      headers: DOUBAN_HEADERS,
      revalidate: REVALIDATE.douban,
      tags: ["schedule", "douban"],
      timeoutMs: 9_000,
    },
  );
}

export async function getDoubanMovies(): Promise<ReleaseItem[]> {
  return withCache("douban:movies:v3", REVALIDATE.douban, async () => {
    const payload = await doubanList("movie/coming_soon", 0, 50);
    return (payload.subjects ?? []).flatMap((subject) => {
      const parsed = parsePubdate(subject);
      if (!parsed) return [];
      return [baseItem(subject, "movie", parsed.date, parsed.region)];
    });
  });
}

export async function getDoubanSeries(): Promise<ReleaseItem[]> {
  return withCache("douban:series:v3", REVALIDATE.douban, async () => {
    const first = await doubanList("tv/coming_soon", 0, 50);
    const total = Math.min(first.total ?? 0, 160);
    const starts = Array.from(
      { length: Math.max(1, Math.ceil(total / 50) - 1) },
      (_, index) => (index + 1) * 50,
    );

    const pages = await Promise.allSettled(
      starts.map((start) => doubanList("tv/coming_soon", start, 50)),
    );

    const subjects = [
      ...(first.subjects ?? []),
      ...pages.flatMap((page) =>
        page.status === "fulfilled" ? (page.value.subjects ?? []) : [],
      ),
    ];

    const seen = new Set<string>();
    return subjects.flatMap((subject) => {
      if (seen.has(subject.id)) return [];
      seen.add(subject.id);

      const parsed = parsePubdate(subject);
      if (!parsed) return [];

      // Douban's TV feed includes animation. Those belong in the anime lane.
      const category: Category = (subject.genres ?? []).includes("动画")
        ? "anime"
        : "series";
      return [baseItem(subject, category, parsed.date, parsed.region)];
    });
  });
}

type DoubanSuggestion = {
  id: string;
  title: string;
  sub_title?: string;
  year?: string;
  type?: string;
  img?: string;
  url?: string;
};

export async function searchDouban(query: string): Promise<SearchResult[]> {
  return withCache(`douban:search:${query.toLowerCase()}`, REVALIDATE.search, async () => {
    const suggestions = await fetchJson<DoubanSuggestion[]>(
      `https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(query)}`,
      {
        headers: DOUBAN_HEADERS,
        revalidate: REVALIDATE.search,
        tags: ["search", "douban"],
        timeoutMs: 7_000,
      },
    );

    return suggestions
      .filter((item) => item.type === "movie" || item.type === "tv")
      .slice(0, 8)
      .map((item) => {
        const category: Category = item.type === "tv" ? "series" : "movie";
        const year = item.year && /^\d{4}$/.test(item.year) ? item.year : undefined;
        return {
          id: `douban-search-${item.type}-${item.id}`,
          category,
          title: item.title,
          originalTitle: item.sub_title,
          summary: year ? `${year} 年豆瓣条目，点击查看详情。` : "豆瓣条目，点击查看详情。",
          cover: proxiedCover(item.img),
          date: year ? `${year}-01-01` : "1970-01-01",
          dateLabel: year ?? "年份待定",
          platforms: [],
          badge: year ?? undefined,
          source: {
            name: "豆瓣",
            url: item.url || `https://movie.douban.com/subject/${item.id}/`,
          },
        } satisfies SearchResult;
      });
  });
}

export function doubanSourceNote(): string {
  return "豆瓣公开条目";
}
