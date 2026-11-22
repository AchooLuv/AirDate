import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomeContent } from "@/components/home-content";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
} from "@/lib/constants";
import {
  formatDateForMeta,
  formatMonthCN,
  isDateInWindow,
  normalizeDateKey,
  todayKey,
} from "@/lib/date";

export const revalidate = 86_400;
export const dynamicParams = true;

type DatePageProps = {
  params: Promise<{ date: string }>;
};

export function generateStaticParams() {
  return [{ date: todayKey() }];
}

export async function generateMetadata({
  params,
}: DatePageProps): Promise<Metadata> {
  const { date: rawDate } = await params;
  const date = normalizeDateKey(rawDate);
  const today = todayKey();
  if (!date || !isDateInWindow(date, today)) {
    return {
      title: `${SITE_NAME} · ${SITE_TAGLINE}`,
      description: SITE_DESCRIPTION,
      alternates: { canonical: "/" },
      robots: { index: false, follow: false },
    };
  }

  const title = `${formatMonthCN(date)} · ${formatDateForMeta(date)} 放送 / 上映 / 发售日历`;
  const isToday = date === today;
  return {
    title,
    description: `${formatDateForMeta(date)}的电影上映、剧集更新、番剧放送与游戏发售时间线。${SITE_DESCRIPTION}`,
    alternates: { canonical: isToday ? "/" : `/date/${date}` },
    ...(isToday || date < today ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title: `${title} · ${SITE_NAME}`,
      description: SITE_DESCRIPTION,
      url: isToday ? "/" : `/date/${date}`,
    },
  };
}

export default async function DatePage({ params }: DatePageProps) {
  const { date: rawDate } = await params;
  const date = normalizeDateKey(rawDate);
  const today = todayKey();
  if (!date || !isDateInWindow(date, today)) notFound();

  return <HomeContent date={date} />;
}
