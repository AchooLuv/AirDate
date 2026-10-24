import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, formatMonthCN, shiftWeek, type WeekDay } from "@/lib/date";

export function WeekStrip({
  week,
  date,
  today,
}: {
  week: WeekDay[];
  date: string;
  today: string;
}) {
  const monthLabel = formatMonthCN(date);
  const previousWeek = shiftWeek(date, -1);
  const nextWeek = shiftWeek(date, 1);

  return (
    <div className="week-shell">
      <div className="week-meta">
        <span className="mono-label">WEEK VIEW</span>
        <strong>{monthLabel}</strong>
        <span>北京时间</span>
      </div>

      <Link
        href={`/?date=${previousWeek}`}
        className="week-arrow"
        aria-label={`上一周，从 ${previousWeek} 开始`}
      >
        <ChevronLeft size={17} />
      </Link>

      <div className="week-days">
        {week.map((day) => (
          <Link
            key={day.key}
            href={`/?date=${day.key}`}
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

      <Link
        href={`/?date=${nextWeek}`}
        className="week-arrow"
        aria-label={`下一周，从 ${nextWeek} 开始`}
      >
        <ChevronRight size={17} />
      </Link>

      <Link href={`/?date=${today}`} className="week-today">
        今天
      </Link>

      <Link
        href={`/?date=${addDays(date, 7)}`}
        className="week-quick-next"
        aria-label="跳到一周后"
      >
        +7D
      </Link>
    </div>
  );
}
