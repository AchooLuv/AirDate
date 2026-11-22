"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  useEffect(() => {
    if (!pathname.startsWith("/date/")) return;

    // A shorter date page can leave the browser at its old bottom position,
    // which makes the viewport land on "即将到来". Start date navigation at
    // the top; keep normal back/forward restoration for the home page.
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

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
