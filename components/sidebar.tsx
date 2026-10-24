import type { CSSProperties } from "react";
import Link from "next/link";
import { Activity, ArrowUpRight, CalendarClock, Database, Radio } from "lucide-react";
import { CoverImage } from "@/components/cover-image";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/categories";
import { datePath, formatMonthDay, relativeDayLabel } from "@/lib/date";
import type { Category, DayData } from "@/lib/types";

type Filter = Category | "all";

export function Sidebar({
  data,
  today,
  active,
  onSelect,
}: {
  data: DayData;
  today: string;
  active: Filter;
  onSelect: (category: Category) => void;
}) {
  const next = data.upcoming[0];
  const maxCount = Math.max(1, ...CATEGORY_ORDER.map((category) => data.counts[category]));

  return (
    <aside className="rail">
      <section className="rail-card signal-card">
        <header className="rail-head">
          <span className="rail-kicker">
            <Activity size={13} />
            DAY SIGNAL
          </span>
          <span className="live-pill">
            <span />
            LIVE
          </span>
        </header>

        <div className="signal-total">
          <strong>{String(data.total).padStart(2, "0")}</strong>
          <div>
            <span>今日放送与发售</span>
            <small>按北京时间聚合</small>
          </div>
        </div>

        <div className="signal-list">
          {CATEGORY_ORDER.map((category) => {
            const meta = CATEGORY_META[category];
            const Icon = meta.icon;
            const count = data.counts[category];
            return (
              <button
                type="button"
                key={category}
                className="signal-row"
                data-active={active === category}
                onClick={() => onSelect(category)}
                style={
                  {
                    "--accent": meta.accent,
                    "--accent-soft": meta.accentSoft,
                  } as CSSProperties
                }
                aria-pressed={active === category}
              >
                <span className="signal-icon">
                  <Icon size={13} />
                </span>
                <span className="signal-label">{meta.label}</span>
                <span className="signal-bar">
                  <span
                    style={{
                      width: `${count === 0 ? 0 : Math.max(9, (count / maxCount) * 100)}%`,
                    }}
                  />
                </span>
                <strong>{String(count).padStart(2, "0")}</strong>
              </button>
            );
          })}
        </div>

        <p className="signal-foot">
          <Radio size={11} />
          点击分类可快速筛选时间线
        </p>
      </section>

      {next ? (
        <Link
          href={datePath(next.date, today)}
          className="rail-card next-card"
          style={
            {
              "--accent": CATEGORY_META[next.category].accent,
              "--accent-soft": CATEGORY_META[next.category].accentSoft,
            } as CSSProperties
          }
        >
          <header className="rail-head">
            <span className="rail-kicker">
              <CalendarClock size={13} />
              NEXT UP
            </span>
            <span className="next-relative">{relativeDayLabel(next.date, data.date)}</span>
          </header>
          <div className="next-body">
            <div className="next-cover">
              <CoverImage src={next.cover} alt={next.title} category={next.category} />
            </div>
            <div className="next-copy">
              <span className="next-date">{formatMonthDay(next.date)}</span>
              <strong>{next.title}</strong>
              <span className="next-meta">
                {CATEGORY_META[next.category].label}
                {next.platforms[0] ? ` · ${next.platforms[0]}` : ""}
              </span>
            </div>
            <ArrowUpRight size={15} className="next-arrow" />
          </div>
          <p className="next-summary">{next.summary || "点击查看这一天的时间线。"}</p>
        </Link>
      ) : null}

      <section className="rail-card source-card" id="sources">
        <header className="rail-head">
          <span className="rail-kicker">
            <Database size={13} />
            DATA SOURCES
          </span>
          <span className="source-count">{data.sources.length} sources</span>
        </header>

        <div className="source-list">
          {data.sources.map((source) => (
            <div className="source-row" key={source.name}>
              <span className="source-status" data-status={source.status} />
              <span className="source-name">
                {source.name}
                {source.note ? <small>{source.note}</small> : null}
              </span>
              <strong>{source.count}</strong>
            </div>
          ))}
        </div>

        <div className="rail-note">
          <span>TIMEZONE</span>
          <strong>Asia / Shanghai</strong>
          <p>放送时间统一换算为北京时间；仅精确到日期的条目显示“全天”。</p>
        </div>
      </section>
    </aside>
  );
}
