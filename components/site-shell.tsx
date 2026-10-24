"use client";

import { useCallback, useEffect, useState } from "react";
import { Hero } from "@/components/hero";
import { ScheduleExplorer } from "@/components/schedule-explorer";
import { SearchDialog } from "@/components/search-dialog";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { UpcomingSection } from "@/components/upcoming-section";
import { WeekStrip } from "@/components/week-strip";
import type { WeekDay } from "@/lib/date";
import type { DayData, ReleaseItem } from "@/lib/types";

export function SiteShell({
  data,
  date,
  today,
  week,
  featured,
}: {
  data: DayData;
  date: string;
  today: string;
  week: WeekDay[];
  featured: ReleaseItem[];
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  return (
    <>
      <a href="#timeline" className="skip-link">
        跳到时间线
      </a>
      <SiteHeader onOpenSearch={openSearch} />
      <main>
        <div className="shell hero-shell">
          <Hero data={data} date={date} today={today} featured={featured} />
          <WeekStrip week={week} date={date} today={today} />
        </div>

        <ScheduleExplorer
          data={data}
          date={date}
          today={today}
          onOpenSearch={openSearch}
        />

        <UpcomingSection data={data} />
      </main>
      <SiteFooter />
      <SearchDialog open={searchOpen} onClose={closeSearch} />
    </>
  );
}
