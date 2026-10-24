import type { CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { PosterStack } from "@/components/poster-stack";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/categories";
import {
  addDays,
  formatMonthCN,
  formatDateCN,
  datePath,
  relativeDayLabel,
  weekdayCN,
} from "@/lib/date";
import type { DayData, ReleaseItem } from "@/lib/types";

export function Hero({
  data,
  date,
  today,
  featured,
}: {
  data: DayData;
  date: string;
  today: string;
  featured: ReleaseItem[];
}) {
  const isToday = date === today;
  const previous = addDays(date, -1);
  const next = addDays(date, 1);

  return (
    <section className="hero">
      <div className="hero-copy-column">
        <div className="eyebrow">
          <span className="eyebrow-pulse" />
          <span>{isToday ? "TODAY ON AIRDATE" : "ON AIRDATE"}</span>
          <span className="eyebrow-line" />
          <span className="eyebrow-muted">{formatMonthCN(date)}</span>
        </div>

        <h1>
          所有值得等待的，
          <span className="hero-gradient">{isToday ? "都在今天。" : "都在这一天。"}</span>
        </h1>

        <p className="hero-lede">
          电影定档、剧集更新、番剧放送、游戏发售——以北京时间排成一条时间线。
          打开 AirDate，就知道今天有什么值得看、值得玩。
        </p>

        <div className="hero-date-row">
          <div className="date-control">
            <Link
              href={datePath(previous, today)}
              className="date-arrow"
              aria-label={`查看 ${previous}`}
            >
              <ChevronLeft size={16} />
            </Link>
            <div className="date-current">
              <CalendarDays size={15} aria-hidden="true" />
              <span className="date-main">{formatDateCN(date)}</span>
              <span className="date-weekday">{weekdayCN(date)}</span>
            </div>
            <Link
              href={datePath(next, today)}
              className="date-arrow"
              aria-label={`查看 ${next}`}
            >
              <ChevronRight size={16} />
            </Link>
          </div>

          {!isToday ? (
            <Link href="/" className="today-link">
              <RotateCcw size={13} />
              回到今天
            </Link>
          ) : (
            <span className="today-hint">
              <span className="today-hint-dot" />
              今日实时日历
            </span>
          )}
        </div>

        <div className="hero-stats" aria-label="今日收录概览">
          <div className="hero-stat-total">
            <strong>{String(data.total).padStart(2, "0")}</strong>
            <span>
              条放送 / 上映 / 发售
              <small>{relativeDayLabel(date, today)} · 北京时间</small>
            </span>
          </div>
          <div className="hero-stat-divider" />
          <div className="hero-categories">
            {CATEGORY_ORDER.map((category) => {
              const meta = CATEGORY_META[category];
              return (
                <div
                  key={category}
                  className="hero-category"
                  style={{ "--cat": meta.accent } as CSSProperties}
                >
                  <span className="hero-category-dot" />
                  <span>{meta.label}</span>
                  <strong>{data.counts[category]}</strong>
                </div>
              );
            })}
          </div>
        </div>

        <div className="hero-links">
          <Link href="#timeline" className="hero-primary-link">
            查看今日时间线
            <ArrowRight size={15} />
          </Link>
          <Link href="#upcoming" className="hero-secondary-link">
            即将到来
          </Link>
        </div>
      </div>

      <div className="hero-visual">
        <PosterStack items={featured} date={date} total={data.total} />
      </div>
    </section>
  );
}
