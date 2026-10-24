import type { CSSProperties } from "react";
import {
  ArrowUpRight,
  Building2,
  Clock3,
  MapPin,
  Star,
  Tag,
} from "lucide-react";
import { CoverImage } from "@/components/cover-image";
import { CATEGORY_META } from "@/lib/categories";
import { formatScore } from "@/lib/format";
import type { ReleaseItem } from "@/lib/types";

export function ReleaseCard({
  item,
  index,
}: {
  item: ReleaseItem;
  index: number;
}) {
  const meta = CATEGORY_META[item.category];
  const Icon = meta.icon;
  const platforms = item.platforms.filter(Boolean);
  const visiblePlatforms = platforms.slice(0, 2);
  const extraPlatforms = Math.max(0, platforms.length - visiblePlatforms.length);
  const score = formatScore(item.score);

  return (
    <a
      href={item.source.url}
      target="_blank"
      rel="noreferrer"
      className="release-card"
      data-category={item.category}
      style={
        {
          "--accent": meta.accent,
          "--accent-soft": meta.accentSoft,
          "--accent-strong": meta.accentStrong,
          "--delay": `${Math.min(index, 8) * 45}ms`,
        } as CSSProperties
      }
      aria-label={`${meta.label}：${item.title}，来源 ${item.source.name}`}
    >
      <span className="release-accent" aria-hidden="true" />

      <div className="release-cover">
        <CoverImage src={item.cover} alt={item.title} category={item.category} />
        <span className="release-cover-category">
          <Icon size={11} />
          {meta.english}
        </span>
      </div>

      <div className="release-content">
        <div className="release-kicker">
          <span className="category-badge">
            <Icon size={11} aria-hidden="true" />
            {meta.label}
          </span>
          {item.badge ? <span className="release-badge">{item.badge}</span> : null}
          {item.episode && !item.badge ? (
            <span className="release-episode">
              <Clock3 size={10} />
              {item.episode}
            </span>
          ) : null}
          <span className="release-source-inline">{item.source.name}</span>
        </div>

        <h3 className="release-title">{item.title}</h3>
        {item.originalTitle ? (
          <p className="release-original">{item.originalTitle}</p>
        ) : null}
        <p className="release-summary">
          {item.summary || "暂无简介，点击查看来源详情。"}
        </p>

        <div className="release-meta">
          {visiblePlatforms.map((platform) => (
            <span className="meta-chip" key={platform}>
              <MapPin size={10} aria-hidden="true" />
              {platform}
            </span>
          ))}
          {extraPlatforms > 0 ? (
            <span className="meta-chip meta-chip-muted">+{extraPlatforms}</span>
          ) : null}
          {item.region ? (
            <span className="meta-chip meta-chip-muted">{item.region}</span>
          ) : null}
          {item.developer ? (
            <span className="meta-chip">
              <Building2 size={10} aria-hidden="true" />
              {item.developer}
            </span>
          ) : item.director ? (
            <span className="meta-chip">
              <Building2 size={10} aria-hidden="true" />
              {item.director}
            </span>
          ) : null}
          {item.price ? (
            <span className="meta-chip meta-chip-accent">
              <Tag size={10} aria-hidden="true" />
              {item.price}
            </span>
          ) : null}
          {score ? (
            <span className="meta-chip meta-chip-score">
              <Star size={10} aria-hidden="true" />
              {score}
            </span>
          ) : null}
        </div>
      </div>

      <div className="release-action" aria-hidden="true">
        <span>{item.time ?? "全天"}</span>
        <ArrowUpRight size={15} />
      </div>
    </a>
  );
}
