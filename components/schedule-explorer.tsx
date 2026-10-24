"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarX2, Search, SlidersHorizontal, X } from "lucide-react";
import { ReleaseCard } from "@/components/release-card";
import { Sidebar } from "@/components/sidebar";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/categories";
import { TIMELINE_GROUPS } from "@/lib/constants";
import { formatDateCN, formatMonthDay, weekdayCN } from "@/lib/date";
import type { Category, DayData, ReleaseItem } from "@/lib/types";

type Filter = Category | "all";

function minutesOf(item: ReleaseItem): number | null {
  if (!item.time) return null;
  const [hours, minutes] = item.time.split(":").map(Number);
  return hours * 60 + minutes;
}

function groupOf(item: ReleaseItem): string {
  const minutes = minutesOf(item);
  if (minutes === null) return "all-day";
  return (
    TIMELINE_GROUPS.find(
      (group) => group.from >= 0 && minutes >= group.from && minutes <= group.to,
    )?.id ?? "evening"
  );
}

export function ScheduleExplorer({
  data,
  date,
  today,
  onOpenSearch,
}: {
  data: DayData;
  date: string;
  today: string;
  onOpenSearch: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(
    () =>
      filter === "all"
        ? data.items
        : data.items.filter((item) => item.category === filter),
    [data.items, filter],
  );

  const groups = useMemo(() => {
    return TIMELINE_GROUPS.map((group) => ({
      ...group,
      items: filtered.filter((item) => groupOf(item) === group.id),
    })).filter((group) => group.items.length > 0);
  }, [filtered]);

  const activeMeta = filter === "all" ? null : CATEGORY_META[filter];
  const nextInCategory =
    filter === "all"
      ? data.upcoming[0]
      : data.upcoming.find((item) => item.category === filter);

  return (
    <section className="shell explorer" id="timeline">
      <div className="explorer-toolbar">
        <div className="category-tabs" role="group" aria-label="按内容类型筛选">
          <button
            type="button"
            className="category-tab category-tab-all"
            data-active={filter === "all"}
            onClick={() => setFilter("all")}
            aria-pressed={filter === "all"}
          >
            <SlidersHorizontal size={13} aria-hidden="true" />
            全部
            <span className="category-tab-count">{data.total}</span>
          </button>
          {CATEGORY_ORDER.map((category) => {
            const meta = CATEGORY_META[category];
            const Icon = meta.icon;
            return (
              <button
                key={category}
                type="button"
                className="category-tab"
                data-active={filter === category}
                data-category={category}
                style={{ "--accent": meta.accent, "--accent-soft": meta.accentSoft } as CSSProperties}
                onClick={() => setFilter(category)}
                aria-pressed={filter === category}
              >
                <Icon size={13} aria-hidden="true" />
                {meta.label}
                <span className="category-tab-count">{data.counts[category]}</span>
              </button>
            );
          })}
        </div>

        <div className="toolbar-actions">
          <button type="button" className="toolbar-search" onClick={onOpenSearch}>
            <Search size={14} aria-hidden="true" />
            <span>搜索片名 / 游戏</span>
            <kbd>⌘K</kbd>
          </button>
          <span className="toolbar-timezone">
            <span className="tz-dot" />
            GMT+8
          </span>
        </div>
      </div>

      <div className="explorer-layout">
        <div className="timeline-column">
          <div className="section-heading">
            <div>
              <span className="section-kicker">TIMELINE</span>
              <h2>{activeMeta ? `${activeMeta.label}时间线` : "今日时间线"}</h2>
            </div>
            <div className="section-meta">
              <span>{formatDateCN(date)} · {weekdayCN(date)}</span>
              <strong>{filtered.length} 条记录</strong>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              filter={filter}
              date={date}
              today={today}
              nextItem={nextInCategory}
              onClear={() => setFilter("all")}
              onSearch={onOpenSearch}
            />
          ) : (
            <div className="timeline">
              {groups.map((group) => (
                <section className="timeline-group" key={group.id}>
                  <header className="timeline-group-head">
                    <div className="group-title">
                      <span className="group-dot" />
                      <strong>{group.label}</strong>
                      <span className="group-hint">{group.hint}</span>
                    </div>
                    <span className="group-count">{group.items.length}</span>
                    <span className="group-line" />
                  </header>

                  <div className="timeline-items">
                    {group.items.map((item, index) => (
                      <div className="release-row" key={item.id}>
                        <span className="release-time">
                          {item.time ?? "全天"}
                        </span>
                        <ReleaseCard item={item} index={index} />
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <Sidebar
          data={data}
          active={filter}
          onSelect={(category) =>
            setFilter((current) => (current === category ? "all" : category))
          }
        />
      </div>
    </section>
  );
}

function EmptyState({
  filter,
  date,
  today,
  nextItem,
  onClear,
  onSearch,
}: {
  filter: Filter;
  date: string;
  today: string;
  nextItem?: ReleaseItem;
  onClear: () => void;
  onSearch: () => void;
}) {
  const meta = filter === "all" ? null : CATEGORY_META[filter];
  const Icon = meta?.icon ?? CalendarX2;
  const isToday = date === today;

  return (
    <div className="empty-state">
      <div
        className="empty-icon"
        style={{ "--accent": meta?.accent ?? "#ffffff" } as CSSProperties}
      >
        <Icon size={24} strokeWidth={1.6} />
      </div>
      <span className="section-kicker">NO SIGNAL</span>
      <h3>
        {isToday ? "今天的时间线还很安静" : "这一天暂时没有收录"}
      </h3>
      <p>
        {meta
          ? `${meta.label}分类在这一天还没有新的放送或发售记录。`
          : "换一天看看，或直接搜索你想追的片名、番剧和游戏。"}
      </p>

      {nextItem ? (
        <Link href={`/?date=${nextItem.date}`} className="empty-next">
          <span className="empty-next-date">{formatMonthDay(nextItem.date)}</span>
          <span className="empty-next-copy">
            <small>最近一场{meta ? meta.label : ""}</small>
            <strong>{nextItem.title}</strong>
          </span>
          <ArrowRight size={15} />
        </Link>
      ) : null}

      <div className="empty-actions">
        {filter !== "all" ? (
          <button type="button" onClick={onClear} className="empty-secondary">
            <X size={14} />
            清除筛选
          </button>
        ) : (
          <Link href={`/?date=${today}`} className="empty-secondary">
            回到今天
          </Link>
        )}
        <button type="button" onClick={onSearch} className="empty-primary">
          <Search size={14} />
          搜索全站
        </button>
      </div>
    </div>
  );
}
