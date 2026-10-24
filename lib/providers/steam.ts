import { withCache } from "@/lib/cache";
import { REVALIDATE } from "@/lib/constants";
import { isValidDateKey } from "@/lib/date";
import { proxiedCover, truncateText } from "@/lib/format";
import { fetchJson, fetchText, stripHtml, uniqueStrings } from "@/lib/http";
import type { ReleaseItem, SearchResult } from "@/lib/types";

type SteamFeaturedItem = {
  id: number;
  name: string;
  discounted?: boolean;
  discount_percent?: number;
  original_price?: number | null;
  final_price?: number;
  currency?: string;
  large_capsule_image?: string;
  header_image?: string;
  windows_available?: boolean;
  mac_available?: boolean;
  linux_available?: boolean;
};

type SteamFeatured = {
  coming_soon?: { items?: SteamFeaturedItem[] };
  new_releases?: { items?: SteamFeaturedItem[] };
  specials?: { items?: SteamFeaturedItem[] };
};

type SteamAppDetails = {
  success?: boolean;
  data?: {
    name?: string;
    steam_appid?: number;
    short_description?: string;
    detailed_description?: string;
    about_the_game?: string;
    header_image?: string;
    capsule_image?: string;
    capsule_imagev5?: string;
    developers?: string[];
    publishers?: string[];
    genres?: Array<{ description?: string }>;
    release_date?: { coming_soon?: boolean; date?: string };
    price_overview?: {
      currency?: string;
      initial?: number;
      final?: number;
      discount_percent?: number;
      initial_formatted?: string;
      final_formatted?: string;
    } | null;
    is_free?: boolean;
    platforms?: { windows?: boolean; mac?: boolean; linux?: boolean };
    metacritic?: { score?: number } | null;
    type?: string;
  };
};

type SteamSearchResponse = {
  items?: Array<{ id: number; name: string; price?: string; image?: string }>;
};

type SteamSearchCandidate = {
  id: number;
  name?: string;
  price?: string;
  image?: string;
};

const STEAM_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

function parseSteamDate(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const zh = value.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (zh) {
    const key = `${zh[1]}-${zh[2].padStart(2, "0")}-${zh[3].padStart(2, "0")}`;
    return isValidDateKey(key) ? key : undefined;
  }

  const numeric = value.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (numeric) {
    const key = `${numeric[1]}-${numeric[2].padStart(2, "0")}-${numeric[3].padStart(2, "0")}`;
    return isValidDateKey(key) ? key : undefined;
  }

  const english = value.match(/([A-Z][a-z]{2,8})\s+(\d{1,2}),\s*(\d{4})/);
  if (english) {
    const parsed = new Date(`${english[1]} ${english[2]}, ${english[3]} 12:00:00 UTC`);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }

  return undefined;
}

function priceOf(data: NonNullable<SteamAppDetails["data"]>): string {
  if (data.is_free) return "免费";
  const price = data.price_overview;
  if (!price) return "价格待定";
  if (price.final_formatted) return price.final_formatted;
  if (price.final != null) {
    return `${price.currency === "CNY" ? "¥ " : ""}${(price.final / 100).toFixed(2)}`;
  }
  return "价格待定";
}

function platformsOf(data: NonNullable<SteamAppDetails["data"]>): string[] {
  const platforms = data.platforms;
  return uniqueStrings([
    "Steam",
    platforms?.windows ? "Windows" : undefined,
    platforms?.mac ? "macOS" : undefined,
    platforms?.linux ? "Linux" : undefined,
  ]);
}

async function appDetail(appId: number): Promise<SteamAppDetails["data"] | null> {
  return withCache(`steam:app:v3:${appId}`, REVALIDATE.steamDetails, async () => {
    const payload = await fetchJson<Record<string, SteamAppDetails>>(
      `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=cn&l=schinese`,
      {
        headers: STEAM_HEADERS,
        revalidate: REVALIDATE.steamDetails,
        tags: ["schedule", "steam"],
        timeoutMs: 5_000,
      },
    );
    const entry = payload[String(appId)];
    if (!entry?.success || !entry.data) return null;
    return entry.data;
  });
}

function mapGame(
  appId: number,
  data: NonNullable<SteamAppDetails["data"]>,
): ReleaseItem | null {
  const date = parseSteamDate(data.release_date?.date);
  if (!date) return null;

  const comingSoon = Boolean(data.release_date?.coming_soon);
  const summary =
    truncateText(stripHtml(data.short_description), 420) ||
    truncateText(stripHtml(data.about_the_game), 420) ||
    "Steam 游戏条目，点击查看详情。";

  return {
    id: `steam-${appId}`,
    category: "game",
    title: data.name || `Steam App ${appId}`,
    summary,
    cover: proxiedCover(data.header_image || data.capsule_imagev5 || data.capsule_image),
    date,
    platforms: platformsOf(data),
    region: "国区",
    developer: uniqueStrings(data.developers ?? []).join(" / "),
    price: priceOf(data),
    badge: comingSoon ? "即将发售" : "已发售",
    genres: data.genres
      ?.map((genre) => genre.description)
      .filter((genre): genre is string => Boolean(genre))
      .slice(0, 3),
    source: {
      name: "Steam",
      url: `https://store.steampowered.com/app/${appId}/`,
    },
  };
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

export async function getSteamGames(): Promise<ReleaseItem[]> {
  return withCache("steam:featured:v5", REVALIDATE.steam, async () => {
    const featured = await fetchJson<SteamFeatured>(
      "https://store.steampowered.com/api/featuredcategories?cc=CN&l=schinese",
      {
        headers: STEAM_HEADERS,
        revalidate: REVALIDATE.steam,
        tags: ["schedule", "steam"],
        timeoutMs: 7_000,
      },
    );

    const candidates = [
      ...(featured.coming_soon?.items ?? []),
      ...(featured.new_releases?.items ?? []),
    ];

    const seen = new Set<number>();
    const unique = candidates.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });

    const details = await mapLimit(unique.slice(0, 20), 8, async (item) => {
      try {
        return { id: item.id, data: await appDetail(item.id) };
      } catch {
        return { id: item.id, data: null };
      }
    });

    return details.flatMap(({ id, data }) => {
      if (!data) return [];
      if (data.type && data.type !== "game") return [];
      const mapped = mapGame(id, data);
      return mapped ? [mapped] : [];
    });
  });
}

function matchesSearchQuery(
  query: string,
  data: NonNullable<SteamAppDetails["data"]> | null | undefined,
  itemName?: string,
): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;
  const name = data?.name || itemName || "";

  if (/[\u3400-\u9fff]/.test(trimmed)) {
    const opening = (data?.short_description ?? "").slice(0, 90);
    return name.includes(trimmed) || opening.includes(trimmed);
  }

  return name.toLowerCase().includes(trimmed.toLowerCase());
}

export async function searchSteam(query: string): Promise<SearchResult[]> {
  return withCache(`steam:search:v7:${query.toLowerCase()}`, REVALIDATE.search, async () => {
    const response = await fetchJson<SteamSearchResponse>(
      `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(
        query,
      )}&cc=cn&l=schinese`,
      {
        headers: STEAM_HEADERS,
        revalidate: REVALIDATE.search,
        tags: ["search", "steam"],
        timeoutMs: 8_000,
      },
    );

    let candidates: SteamSearchCandidate[] = (response.items ?? [])
      .slice(0, 5)
      .map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
      }));

    // Steam's JSON endpoint does not match Chinese keywords. Fall back to the
    // store search page, which does, and hydrate the app ids through appdetails.
    if (!candidates.length) {
      const html = await fetchText(
        `https://store.steampowered.com/search/?term=${encodeURIComponent(
          query,
        )}&cc=cn&l=schinese`,
        {
          headers: STEAM_HEADERS,
          revalidate: REVALIDATE.search,
          tags: ["search", "steam"],
          timeoutMs: 10_000,
        },
      );

      const seen = new Set<number>();
      for (const match of html.matchAll(/data-ds-appid="(\d+)"/g)) {
        const id = Number(match[1]);
        if (!Number.isFinite(id) || seen.has(id)) continue;
        seen.add(id);
        candidates.push({ id });
        if (candidates.length >= 8) break;
      }
    }

    const details = await mapLimit(candidates, 3, async (item) => {
      try {
        return { item, data: await appDetail(item.id) };
      } catch {
        return { item, data: null };
      }
    });

    return details
      .filter(
        ({ item, data }) =>
          (!data?.type || data.type === "game") &&
          matchesSearchQuery(query, data, item.name),
      )
      .map(({ item, data }) => {
        const date = parseSteamDate(data?.release_date?.date);
        const price = data ? priceOf(data) : item.price || "价格待定";
        return {
          id: `steam-search-${item.id}`,
          category: "game",
          title: data?.name || item.name || `Steam App ${item.id}`,
          summary:
            truncateText(stripHtml(data?.short_description), 300) ||
            "Steam 游戏条目，点击查看详情。",
          cover: proxiedCover(data?.header_image || item.image),
          date: date || "1970-01-01",
          dateLabel: date
            ? `发售 ${date}`
            : data?.release_date?.date || "发售日待定",
          platforms: data ? platformsOf(data) : ["Steam"],
          region: "国区",
          developer: uniqueStrings(data?.developers ?? []).join(" / "),
          price,
          badge: data?.release_date?.coming_soon ? "即将发售" : "游戏",
          genres: data?.genres
            ?.map((genre) => genre.description)
            .filter((genre): genre is string => Boolean(genre))
            .slice(0, 3),
          source: {
            name: "Steam",
            url: `https://store.steampowered.com/app/${item.id}/`,
          },
        } satisfies SearchResult;
      });
  });
}
