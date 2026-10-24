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
  normalizeDateKey,
  todayKey,
} from "@/lib/date";

export const revalidate = 300;
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
  if (!date) {
    return {
      title: `${SITE_NAME} · ${SITE_TAGLINE}`,
      description: SITE_DESCRIPTION,
      alternates: { canonical: "/" },
    };
  }

  const title = `${formatMonthCN(date)} · ${formatDateForMeta(date)} 放送 / 上映 / 发售日历`;
  const isToday = date === todayKey();
  return {
    title,
    description: `${formatDateForMeta(date)}的电影上映、剧集更新、番剧放送与游戏发售时间线。${SITE_DESCRIPTION}`,
    alternates: { canonical: isToday ? "/" : `/date/${date}` },
    ...(isToday ? { robots: { index: false, follow: true } } : {}),
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
  if (!date) notFound();

  return <HomeContent date={date} />;
}
