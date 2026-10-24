type CacheEntry = {
  value: unknown;
  freshUntil: number;
  purgeAt: number;
};

type CacheGlobal = typeof globalThis & {
  __airdateCache?: Map<string, CacheEntry>;
  __airdateInflight?: Map<string, Promise<unknown>>;
};

const globalCache = globalThis as CacheGlobal;
const memory = (globalCache.__airdateCache ??= new Map<string, CacheEntry>());
const inflight = (globalCache.__airdateInflight ??= new Map<string, Promise<unknown>>());

const KEY_PREFIX = "airdate:v1:";
const STALE_FOR_MS = 6 * 60 * 60 * 1000;

function redisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

async function redisCommand<T>(
  command: Array<string | number>,
): Promise<T | null> {
  const config = redisConfig();
  if (!config) return null;

  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      cache: "no-store",
      signal: AbortSignal.timeout(2_500),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { result?: T; error?: string };
    if (payload.error) return null;
    return payload.result ?? null;
  } catch {
    return null;
  }
}

function readMemory<T>(key: string, allowStale = false): T | null {
  const entry = memory.get(KEY_PREFIX + key);
  if (!entry) return null;
  const now = Date.now();
  if (entry.freshUntil > now || (allowStale && entry.purgeAt > now)) {
    return entry.value as T;
  }
  if (entry.purgeAt <= now) memory.delete(KEY_PREFIX + key);
  return null;
}

function writeMemory(key: string, value: unknown, ttlSeconds: number): void {
  const now = Date.now();
  memory.set(KEY_PREFIX + key, {
    value,
    freshUntil: now + ttlSeconds * 1_000,
    purgeAt: now + ttlSeconds * 1_000 + STALE_FOR_MS,
  });

  // Avoid unbounded growth on warm serverless instances.
  if (memory.size > 220) {
    const oldest = memory.keys().next().value;
    if (oldest) memory.delete(oldest);
  }
}

/**
 * Two-layer cache:
 * 1. Next.js Data Cache is handled by fetch() revalidation in each provider.
 * 2. This helper adds a process-memory L1 and an optional Upstash cross-instance L2.
 *
 * On upstream failure, an expired-but-recent value is served as a stale fallback.
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const fresh = readMemory<T>(key);
  if (fresh !== null) return fresh;

  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const task = (async () => {
    const remote = await redisCommand<string>(["GET", KEY_PREFIX + key]);
    if (remote) {
      try {
        const parsed = JSON.parse(remote) as T;
        writeMemory(key, parsed, ttlSeconds);
        return parsed;
      } catch {
        // Ignore a malformed remote entry and rebuild it below.
      }
    }

    try {
      const value = await loader();
      writeMemory(key, value, ttlSeconds);
      if (redisConfig()) {
        void redisCommand(["SET", KEY_PREFIX + key, JSON.stringify(value), "EX", ttlSeconds]);
      }
      return value;
    } catch (error) {
      const stale = readMemory<T>(key, true);
      if (stale !== null) {
        console.warn(`[cache] serving stale entry for ${key}`);
        return stale;
      }
      throw error;
    }
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, task);
  return task;
}

export function clearMemoryCache(): void {
  memory.clear();
}
