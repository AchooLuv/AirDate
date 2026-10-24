import { Clapperboard, Gamepad2, Sparkles, Tv } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Category } from "@/lib/types";

export type CategoryMeta = {
  label: string;
  english: string;
  description: string;
  accent: string;
  accentSoft: string;
  accentStrong: string;
  gradient: string;
  icon: LucideIcon;
};

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  movie: {
    label: "电影",
    english: "FILM",
    description: "院线上映与新片定档",
    accent: "#f7b955",
    accentSoft: "rgba(247, 185, 85, 0.14)",
    accentStrong: "#ffd68a",
    gradient: "linear-gradient(135deg, #ffd68a 0%, #f39a37 100%)",
    icon: Clapperboard,
  },
  series: {
    label: "剧集",
    english: "SERIES",
    description: "剧集更新与首播",
    accent: "#5ab6ff",
    accentSoft: "rgba(90, 182, 255, 0.14)",
    accentStrong: "#a9dcff",
    gradient: "linear-gradient(135deg, #a9dcff 0%, #3b82f6 100%)",
    icon: Tv,
  },
  anime: {
    label: "番剧",
    english: "ANIME",
    description: "新番放送与配信",
    accent: "#d28cff",
    accentSoft: "rgba(210, 140, 255, 0.14)",
    accentStrong: "#e9c2ff",
    gradient: "linear-gradient(135deg, #efc2ff 0%, #b45cf0 100%)",
    icon: Sparkles,
  },
  game: {
    label: "游戏",
    english: "GAME",
    description: "新作发售与定档",
    accent: "#5de2a5",
    accentSoft: "rgba(93, 226, 165, 0.14)",
    accentStrong: "#a8f5ce",
    gradient: "linear-gradient(135deg, #a8f5ce 0%, #22c779 100%)",
    icon: Gamepad2,
  },
};

export const CATEGORY_ORDER: Category[] = ["movie", "series", "anime", "game"];

export function categoryMeta(category: Category): CategoryMeta {
  return CATEGORY_META[category];
}
