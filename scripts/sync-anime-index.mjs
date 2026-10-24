import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const data = require("bangumi-data");
const here = dirname(fileURLToPath(import.meta.url));

const PRIORITY = [
  "bilibili",
  "iqiyi",
  "youku",
  "mgtv",
  "tencent",
  "netflix",
  "disney",
  "prime",
  "hulu",
  "crunchyroll",
  "abema",
  "unext",
  "danime",
  "ani_one",
  "gamer",
];

const siteMeta = data.siteMeta ?? {};
const platformBySite = new Map();

for (const [key, meta] of Object.entries(siteMeta)) {
  if (meta?.type !== "onair" || !meta.title) continue;
  platformBySite.set(key, {
    title: meta.title,
    priority: PRIORITY.includes(key) ? PRIORITY.indexOf(key) : PRIORITY.length,
  });
}

const byAniListId = new Map();

for (const item of data.items ?? []) {
  const aniList = item.sites?.find((site) => site.site === "aniList")?.id;
  if (!aniList) continue;

  const zh = item.titleTranslate?.["zh-Hans"]?.[0]?.trim();
  const en = item.titleTranslate?.en?.[0]?.trim();
  const platforms = [];
  const seen = new Set();

  const onairSites = (item.sites ?? [])
    .map((site) => {
      const meta = platformBySite.get(site.site);
      return meta ? { ...meta, key: site.site } : null;
    })
    .filter(Boolean)
    .sort((left, right) => left.priority - right.priority);

  for (const site of onairSites) {
    if (seen.has(site.title)) continue;
    seen.add(site.title);
    platforms.push(site.title);
    if (platforms.length >= 3) break;
  }

  const record = {
    a: String(aniList),
    ...(zh && zh !== item.title ? { z: zh } : {}),
    ...(en ? { e: en } : {}),
    t: item.title,
    ...(platforms.length ? { p: platforms } : {}),
    ...(item.begin ? { b: String(item.begin).slice(0, 10) } : {}),
  };

  const existing = byAniListId.get(record.a);
  if (!existing) {
    byAniListId.set(record.a, record);
    continue;
  }

  const existingScore = (existing.z ? 4 : 0) + (existing.p?.length ?? 0);
  const recordScore = (record.z ? 4 : 0) + (record.p?.length ?? 0);
  if (recordScore > existingScore) byAniListId.set(record.a, record);
}

const items = [...byAniListId.values()].sort((left, right) =>
  left.a.localeCompare(right.a, "en"),
);

const output = {
  source: "bangumi-data",
  license: "CC-BY-4.0",
  count: items.length,
  items,
};

const outputPath = resolve(here, "../data/anime-index.json");
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(output), "utf8");

console.log(
  `Wrote ${items.length} AniList-keyed anime records (${Math.round(
    Buffer.byteLength(JSON.stringify(output)) / 1024,
  )} KiB) to ${outputPath}`,
);
