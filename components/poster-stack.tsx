"use client";

import type { CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
import { CoverImage } from "@/components/cover-image";
import { CATEGORY_META } from "@/lib/categories";
import { formatMonthDay } from "@/lib/date";
import type { ReleaseItem } from "@/lib/types";

export function PosterStack({
  items,
  date,
  total,
}: {
  items: ReleaseItem[];
  date: string;
  total: number;
}) {
  return (
    <div className="poster-stage" aria-hidden="true">
      <div className="poster-orbit poster-orbit-a" />
      <div className="poster-orbit poster-orbit-b" />
      <div className="poster-grid-lines" />
      <div className="poster-glow" />

      {[0, 1, 2].map((index) => {
        const item = items[index];
        return (
          <div
            key={item?.id ?? `placeholder-${index}`}
            className={`poster-card poster-card-${index + 1}`}
            style={
              item
                ? {
                    "--poster-accent": CATEGORY_META[item.category].accent,
                    "--poster-soft": CATEGORY_META[item.category].accentSoft,
                  } as CSSProperties
                : undefined
            }
          >
            {item ? (
              <>
                <CoverImage
                  src={item.cover}
                  alt={item.title}
                  category={item.category}
                  eager={index === 1}
                />
                <div className="poster-scrim" />
                <div className="poster-info">
                  <span className="poster-category">
                    {CATEGORY_META[item.category].label} ·{" "}
                    {item.time ?? "ALL DAY"}
                  </span>
                  <strong>{item.title}</strong>
                </div>
              </>
            ) : (
              <div className="poster-placeholder">
                <span className="poster-placeholder-kicker">AIRDATE</span>
                <strong>{formatMonthDay(date)}</strong>
                <span className="poster-placeholder-caption">RELEASE RADAR</span>
              </div>
            )}
            {index === 1 ? <span className="poster-live">TODAY</span> : null}
          </div>
        );
      })}

      <div className="poster-counter">
        <div>
          <span>ON THE RADAR</span>
          <strong>{String(total).padStart(2, "0")}</strong>
        </div>
        <ArrowUpRight size={16} />
      </div>
    </div>
  );
}
