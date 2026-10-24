const PROXY_HOSTS = [
  "doubanio.com",
  "tvmaze.com",
  "anilist.co",
  "bgm.tv",
  "steamstatic.com",
  "steampowered.com",
  "tmdb.org",
  "wikimedia.org",
];

const HOST_REFERERS: Array<[string, string]> = [
  ["doubanio.com", "https://movie.douban.com/"],
  ["bgm.tv", "https://bgm.tv/"],
  ["steamstatic.com", "https://store.steampowered.com/"],
  ["steampowered.com", "https://store.steampowered.com/"],
];

export function canProxyImage(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return false;
    return PROXY_HOSTS.some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}

export function proxiedCover(rawUrl: string | null | undefined): string | undefined {
  if (!rawUrl) return undefined;
  if (!rawUrl.startsWith("https://")) return undefined;
  if (!canProxyImage(rawUrl)) return rawUrl;
  return `/api/image?src=${encodeURIComponent(rawUrl)}`;
}

export function imageReferer(rawUrl: string): string | undefined {
  try {
    const host = new URL(rawUrl).hostname;
    return HOST_REFERERS.find(
      ([suffix]) => host === suffix || host.endsWith(`.${suffix}`),
    )?.[1];
  } catch {
    return undefined;
  }
}

export function cleanText(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

export function truncateText(input: string, length: number): string {
  const text = cleanText(input);
  if (text.length <= length) return text;
  return `${text.slice(0, length).trimEnd()}…`;
}

export function splitList(input: string | null | undefined): string[] {
  if (!input) return [];
  return input
    .split(/\s*[·/、,，]\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatScore(score: number | null | undefined): string | undefined {
  if (!score || score <= 0) return undefined;
  return score.toFixed(score % 1 === 0 ? 0 : 1);
}
