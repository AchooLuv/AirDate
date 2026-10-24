export const SITE_NAME = "AirDate";
export const SITE_TAGLINE = "电影、剧集、番剧与游戏的上映 / 放送 / 发售日历";
export const SITE_DESCRIPTION =
  "AirDate 聚合电影定档、剧集更新、番剧放送与游戏发售信息，以北京时间时间线和日历展示。每天打开，就知道今天有什么值得看、值得玩。";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://muri.life";
export const GITHUB_URL = "https://github.com/AchooLuv/AirDate";
export const SOURCE_CONTACT =
  process.env.SOURCE_CONTACT || "https://github.com/AchooLuv/AirDate";

export const REVALIDATE = {
  schedule: 900,
  douban: 10_800,
  tvmaze: 3_600,
  anime: 1_800,
  bangumi: 21_600,
  steam: 7_200,
  steamDetails: 21_600,
  search: 1_800,
} as const;

export const SEARCH_MIN_LENGTH = 1;
export const SEARCH_LIMIT = 24;

export const TIMELINE_GROUPS = [
  { id: "all-day", label: "全天", hint: "ALL DAY", from: -1, to: -1 },
  { id: "late-night", label: "深夜", hint: "00:00 — 05:59", from: 0, to: 359 },
  { id: "morning", label: "上午", hint: "06:00 — 11:59", from: 360, to: 719 },
  { id: "afternoon", label: "下午", hint: "12:00 — 17:59", from: 720, to: 1079 },
  { id: "evening", label: "晚间", hint: "18:00 — 23:59", from: 1080, to: 1439 },
] as const;

export type TimelineGroupId = (typeof TIMELINE_GROUPS)[number]["id"];
