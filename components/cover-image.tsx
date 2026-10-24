"use client";

import { useState } from "react";
import { Clapperboard, Gamepad2, Sparkles, Tv } from "lucide-react";
import type { Category } from "@/lib/types";

const FALLBACK_ICONS = {
  movie: Clapperboard,
  series: Tv,
  anime: Sparkles,
  game: Gamepad2,
} as const;

export function CoverImage({
  src,
  alt,
  category,
  className = "",
  eager = false,
}: {
  src?: string;
  alt: string;
  category: Category;
  className?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const Icon = FALLBACK_ICONS[category];

  if (!src || failed) {
    return (
      <div className={`cover-fallback cover-fallback-${category} ${className}`}>
        <Icon size={26} strokeWidth={1.5} aria-hidden="true" />
        <span>{alt.slice(0, 1)}</span>
      </div>
    );
  }

  return (
    // A plain img is intentional: covers are already proxied and cached by /api/image.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={`cover-image ${className}`}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
