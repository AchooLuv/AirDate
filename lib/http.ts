const DEFAULT_UA =
  "AirDate/1.0 (+https://github.com/AchooLuv/AirDate) release-calendar-aggregator";

type FetchOptions = RequestInit & {
  timeoutMs?: number;
  revalidate?: number;
  tags?: string[];
};

export class UpstreamError extends Error {
  status: number;
  url: string;

  constructor(message: string, status: number, url: string) {
    super(message);
    this.name = "UpstreamError";
    this.status = status;
    this.url = url;
  }
}

export async function fetchJson<T>(
  url: string,
  options: FetchOptions = {},
): Promise<T> {
  const {
    timeoutMs = 9_000,
    revalidate = 1_800,
    tags = ["airdate"],
    headers,
    ...init
  } = options;

  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "User-Agent": DEFAULT_UA,
      ...headers,
    },
    signal: AbortSignal.timeout(timeoutMs),
    next: init.method && init.method !== "GET" ? undefined : { revalidate, tags },
  });

  if (!response.ok) {
    throw new UpstreamError(
      `Upstream returned ${response.status}`,
      response.status,
      url,
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new UpstreamError("Upstream returned invalid JSON", 502, url);
  }
}

export async function fetchText(
  url: string,
  options: FetchOptions = {},
): Promise<string> {
  const { timeoutMs = 9_000, revalidate = 3_600, tags = ["airdate"], headers, ...init } =
    options;

  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "text/plain,text/html,*/*",
      "User-Agent": DEFAULT_UA,
      ...headers,
    },
    signal: AbortSignal.timeout(timeoutMs),
    next: { revalidate, tags },
  });

  if (!response.ok) {
    throw new UpstreamError(
      `Upstream returned ${response.status}`,
      response.status,
      url,
    );
  }
  return response.text();
}

export function stripHtml(input: string | null | undefined): string {
  if (!input) return "";
  return decodeEntities(
    input
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/p>/gi, " ")
      .replace(/<[^>]*>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

export function decodeEntities(input: string): string {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    hellip: "…",
    mdash: "—",
    ndash: "–",
    rsquo: "’",
    lsquo: "‘",
    ldquo: "“",
    rdquo: "”",
  };

  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCodePoint(Number.parseInt(dec, 10)),
    )
    .replace(/&([a-z]+);/gi, (match, name: string) => named[name.toLowerCase()] ?? match);
}

export function truncate(input: string, maxLength: number): string {
  if (input.length <= maxLength) return input;
  return `${input.slice(0, maxLength).trimEnd()}…`;
}

export function uniqueStrings(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!value) continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}
