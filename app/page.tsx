import type { Metadata } from "next";
import { SiteShell } from "@/components/site-shell";
import { getDayData } from "@/lib/aggregate";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/constants";
import {
  formatDateForMeta,
  formatMonthCN,
  getWeekDays,
  normalizeDateKey,
  todayKey,
} from "@/lib/date";
import type { ReleaseItem } from "@/lib/types";

export const dynamic = "force-dynamic";

type HomeSearchParams = Promise<{
  date?: string | string[];
}>;

function pickFeatured(items: ReleaseItem[], upcoming: ReleaseItem[]): ReleaseItem[] {
  const pool = [...items, ...upcoming].filter((item) => Boolean(item.cover));
  const selected: ReleaseItem[] = [];
  const seen = new Set<string>();

  for (const category of ["movie", "anime", "game", "series"] as const) {
    const candidate = pool.find(
      (item) => item.category === category && !seen.has(item.id),
    );
    if (candidate) {
      selected.push(candidate);
      seen.add(candidate.id);
    }
  }

  for (const item of pool) {
    if (selected.length >= 3) break;
    if (seen.has(item.id)) continue;
    selected.push(item);
    seen.add(item.id);
  }

  return selected.slice(0, 3);
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: HomeSearchParams;
}): Promise<Metadata> {
  const params = await searchParams;
  const rawDate = typeof params.date === "string" ? params.date : undefined;
  const selected = normalizeDateKey(rawDate);
  if (!selected) {
    return {
      title: `${SITE_NAME} · ${SITE_TAGLINE}`,
      description: SITE_DESCRIPTION,
      alternates: { canonical: "/" },
    };
  }

  const title = `${formatMonthCN(selected)} · ${formatDateForMeta(selected)} 放送 / 上映 / 发售日历`;
  return {
    title,
    description: `${formatDateForMeta(selected)}的电影上映、剧集更新、番剧放送与游戏发售时间线。${SITE_DESCRIPTION}`,
    alternates: { canonical: `/?date=${selected}` },
    openGraph: {
      title: `${title} · ${SITE_NAME}`,
      description: SITE_DESCRIPTION,
      url: `/?date=${selected}`,
    },
  };
}

export default async function Home({ searchParams }: { searchParams: HomeSearchParams }) {
  const params = await searchParams;
  const rawDate = typeof params.date === "string" ? params.date : undefined;
  const date = normalizeDateKey(rawDate) ?? todayKey();
  const today = todayKey();
  const data = await getDayData(date);
  const week = getWeekDays(date, today);
  const featured = pickFeatured(data.items, data.upcoming);

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: "zh-CN",
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/api/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <SiteShell
        data={data}
        date={date}
        today={today}
        week={week}
        featured={featured}
      />
    </>
  );
}
