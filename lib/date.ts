const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export const TIMEZONE = "Asia/Shanghai";
export const WEEKDAYS_CN = [
  "星期日",
  "星期一",
  "星期二",
  "星期三",
  "星期四",
  "星期五",
  "星期六",
] as const;
export const WEEKDAYS_SHORT_CN = ["日", "一", "二", "三", "四", "五", "六"] as const;

/** Date key for "now" in Asia/Shanghai (UTC+8, no DST). */
export function todayKey(now: Date = new Date()): string {
  return new Date(now.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

export function isValidDateKey(key: string | null | undefined): key is string {
  if (!key || !DATE_KEY_RE.test(key)) return false;
  const [year, month, day] = key.split("-").map(Number);
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function normalizeDateKey(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  return isValidDateKey(trimmed) ? trimmed : null;
}

/** Parse a date key as noon in Shanghai to avoid edge cases around midnight. */
export function parseDateKey(key: string): Date {
  return new Date(`${key}T12:00:00+08:00`);
}

export function addDays(key: string, amount: number): string {
  const date = new Date(`${key}T12:00:00+08:00`);
  date.setUTCDate(date.getUTCDate() + amount);
  return new Date(date.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

export function startOfShanghaiDay(key: string): Date {
  return new Date(`${key}T00:00:00+08:00`);
}

export function endOfShanghaiDay(key: string): Date {
  return new Date(`${key}T23:59:59.999+08:00`);
}

export function dayUnixRange(key: string): { from: number; to: number } {
  const from = Math.floor(startOfShanghaiDay(key).getTime() / 1000);
  return { from, to: from + 24 * 60 * 60 };
}

/** Convert any instant to its Shanghai calendar date key. */
export function toShanghaiKey(input: string | number | Date): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

export function timeInShanghai(input: string | number | Date): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace("24:", "00:");
}

/** Weekday index (0 = Sunday) for a plain date key. */
export function weekdayIndex(key: string): number {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function weekdayCN(key: string): string {
  return WEEKDAYS_CN[weekdayIndex(key)];
}

export function weekdayShortCN(key: string): string {
  return WEEKDAYS_SHORT_CN[weekdayIndex(key)];
}

export function formatDateCN(key: string, withYear = true): string {
  const [year, month, day] = key.split("-").map(Number);
  return withYear
    ? `${year} 年 ${month} 月 ${day} 日`
    : `${month} 月 ${day} 日`;
}

export function formatMonthDay(key: string): string {
  const [, month, day] = key.split("-").map(Number);
  return `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`;
}

export function formatMonthCN(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return `${year} 年 ${month} 月`;
}

export function daysBetween(fromKey: string, toKey: string): number {
  const from = new Date(`${fromKey}T00:00:00Z`).getTime();
  const to = new Date(`${toKey}T00:00:00Z`).getTime();
  return Math.round((to - from) / 86_400_000);
}

export function relativeDayLabel(key: string, baseKey: string): string {
  const diff = daysBetween(baseKey, key);
  if (diff === 0) return "今天";
  if (diff === 1) return "明天";
  if (diff === 2) return "后天";
  if (diff === -1) return "昨天";
  if (diff > 2 && diff <= 7) return `${diff} 天后`;
  if (diff < -1 && diff >= -7) return `${Math.abs(diff)} 天前`;
  return formatMonthDay(key);
}

export type WeekDay = {
  key: string;
  day: number;
  month: number;
  weekday: string;
  isToday: boolean;
  isSelected: boolean;
  isPast: boolean;
};

export function getWeekDays(selectedKey: string, nowKey: string): WeekDay[] {
  const index = weekdayIndex(selectedKey);
  const mondayOffset = index === 0 ? -6 : 1 - index;
  return Array.from({ length: 7 }, (_, i) => {
    const key = addDays(selectedKey, mondayOffset + i);
    const [, month, day] = key.split("-").map(Number);
    return {
      key,
      day,
      month,
      weekday: weekdayShortCN(key),
      isToday: key === nowKey,
      isSelected: key === selectedKey,
      isPast: key < nowKey,
    };
  });
}

export function shiftWeek(key: string, direction: -1 | 1): string {
  return addDays(key, direction * 7);
}

export function isWeekend(key: string): boolean {
  const day = weekdayIndex(key);
  return day === 0 || day === 6;
}

export function formatDateForMeta(key: string): string {
  return `${formatDateCN(key)} ${weekdayCN(key)}`;
}
