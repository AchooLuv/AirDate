import Link from "next/link";
import {
  datePath,
  formatMonthCN,
  type WeekDay,
} from "@/lib/date";

export function WeekStrip({
  week,
  date,
  today,
}: {
  week: WeekDay[];
  date: string;
  today: string;
}) {
  const monthLabel = formatMonthCN(today);

  return (
    <div className="week-shell">
      <div className="week-meta">
        <span className="mono-label">RANGE VIEW</span>
        <strong>{monthLabel}</strong>
        <span>前后 3 天</span>
      </div>

      <div className="week-days">
        {week.map((day) => (
          <Link
            key={day.key}
            href={datePath(day.key, today)}
            prefetch={false}
            className={[
              "week-day",
              day.isSelected ? "is-selected" : "",
              day.isToday ? "is-today" : "",
              day.isPast ? "is-past" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-current={day.isSelected ? "date" : undefined}
          >
            <span className="week-day-label">
              {day.isToday ? "今天" : `周${day.weekday}`}
            </span>
            <strong className="week-day-number">{day.day}</strong>
            <span className="week-day-month">{day.month} 月</span>
          </Link>
        ))}
      </div>

      <Link href="/" className="week-today">
        今天
      </Link>
    </div>
  );
}
