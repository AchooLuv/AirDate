import rawIndex from "@/data/anime-index.json";

export type AnimeIndexRecord = {
  a: string;
  z?: string;
  e?: string;
  t: string;
  p?: string[];
  b?: string;
};

const records = (rawIndex as { items: AnimeIndexRecord[] }).items;
const byId = new Map<string, AnimeIndexRecord>();
const byTitle = new Map<string, AnimeIndexRecord>();

export function normalizeAnimeTitle(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\-–—:：·・!！?？,，。.、'’"“”()（）\[\]【】《》<>/\\_]/g, "")
    .trim();
}

for (const record of records) {
  byId.set(record.a, record);
  for (const title of [record.z, record.t, record.e]) {
    const key = normalizeAnimeTitle(title);
    if (key.length >= 2 && !byTitle.has(key)) byTitle.set(key, record);
  }
}

export function findAnimeById(id: string | number): AnimeIndexRecord | undefined {
  return byId.get(String(id));
}

export function findAnimeByTitle(title: string | null | undefined): AnimeIndexRecord | undefined {
  const key = normalizeAnimeTitle(title);
  return key ? byTitle.get(key) : undefined;
}

export function searchAnimeRecords(query: string, limit = 10): AnimeIndexRecord[] {
  const key = normalizeAnimeTitle(query);
  if (!key) return [];

  const matches: Array<{ record: AnimeIndexRecord; score: number; begin: string }> = [];

  for (const record of records) {
    let best = 0;
    for (const [index, title] of [record.z, record.t, record.e].entries()) {
      const normalized = normalizeAnimeTitle(title);
      if (!normalized) continue;
      let score = 0;
      if (normalized === key) score = 100;
      else if (normalized.startsWith(key)) score = 80;
      else if (normalized.includes(key)) score = 60;
      if (score > 0) {
        // Prefer the localized title and, on ties, the most recent broadcast.
        score += index === 0 ? 6 : 0;
        best = Math.max(best, score);
      }
    }
    if (best > 0) {
      matches.push({ record, score: best, begin: record.b ?? "" });
    }
  }

  return matches
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return right.begin.localeCompare(left.begin);
    })
    .slice(0, limit)
    .map((match) => match.record);
}
