import type { CSSProperties } from "react";
import { ArrowUpRight, CalendarRange } from "lucide-react";
import { CoverImage } from "@/components/cover-image";
import { CATEGORY_META } from "@/lib/categories";
import { formatMonthDay, relativeDayLabel, weekdayShortCN } from "@/lib/date";
import type { DayData } from "@/lib/types";

export function UpcomingSection({ data }: { data: DayData }) {
  const items = data.upcoming.slice(0, 9);
  if (!items.length) return null;

  return (
    <section className="shell upcoming-section" id="upcoming">
      <div className="section-heading">
        <div>
          <span className="section-kicker">NEXT IN LINE</span>
          <h2>即将到来</h2>
        </div>
        <div className="section-meta">
          <span>从这一天之后开始</span>
          <strong>{data.upcoming.length} 条前瞻</strong>
        </div>
      </div>

      <div className="upcoming-grid">
        {items.map((item, index) => {
          const meta = CATEGORY_META[item.category];
          return (
            <a
              key={item.id}
              href={item.source.url}
              target="_blank"
              rel="noreferrer"
              className="upcoming-card"
              data-category={item.category}
              style={
                {
                  "--accent": meta.accent,
                  "--accent-soft": meta.accentSoft,
                  "--accent-strong": meta.accentStrong,
                  "--delay": `${index * 50}ms`,
                } as CSSProperties
              }
            >
              <div className="upcoming-cover">
                <CoverImage src={item.cover} alt={item.title} category={item.category} />
              </div>
              <div className="upcoming-content">
                <div className="upcoming-topline">
                  <span className="upcoming-category">
                    <CalendarRange size={11} />
                    {meta.label}
                  </span>
                  <span className="upcoming-relative">{relativeDayLabel(item.date, data.date)}</span>
                </div>
                <h3>{item.title}</h3>
                <div className="upcoming-date">
                  <strong>{formatMonthDay(item.date)}</strong>
                  <span>周{weekdayShortCN(item.date)}</span>
                </div>
                <p>
                  {item.platforms[0] ?? item.region ?? "档期已收录"}
                  {item.price ? ` · ${item.price}` : ""}
                </p>
              </div>
              <ArrowUpRight size={16} className="upcoming-arrow" />
            </a>
          );
        })}
      </div>
    </section>
  );
}
