"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  CornerDownLeft,
  Loader2,
  Search,
  SearchX,
  Sparkles,
  X,
} from "lucide-react";
import { CoverImage } from "@/components/cover-image";
import { CATEGORY_META } from "@/lib/categories";
import type { SearchResult } from "@/lib/types";

const SUGGESTIONS = ["沙丘", "葬送的芙莉莲", "空洞骑士", "Severance", "流浪地球"];

export function SearchDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();

    if (!trimmed) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Search failed");
        const payload = (await response.json()) as { results?: SearchResult[] };
        setResults(payload.results ?? []);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return;
        }
        setError("搜索暂时不可用，请稍后重试。");
        setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 260);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, open]);

  if (!open) return null;

  const hasQuery = query.trim().length > 0;
  const showSuggestions = !hasQuery;

  return (
    <div
      className="search-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="搜索电影、剧集、番剧和游戏"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="search-panel">
        <div className="search-input-row">
          <Search size={20} className="search-leading" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="search-input"
            placeholder="搜索电影、剧集、番剧、游戏…"
            aria-label="搜索关键词"
            autoComplete="off"
            spellCheck={false}
          />
          {loading ? (
            <Loader2 size={18} className="search-spinner" aria-label="搜索中" />
          ) : null}
          {query ? (
            <button
              type="button"
              className="search-clear"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="清空搜索"
            >
              <X size={15} />
            </button>
          ) : null}
          <button type="button" className="search-close" onClick={onClose}>
            ESC
          </button>
        </div>

        <div className="search-body">
          {showSuggestions ? (
            <div className="search-start">
              <span className="section-kicker">SEARCH THE RADAR</span>
              <h3>下一部想看的，叫什么？</h3>
              <p>输入中文名、原名或英文名，电影、剧集、番剧与游戏会一起搜索。</p>
              <div className="search-suggestions">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setQuery(suggestion);
                      inputRef.current?.focus();
                    }}
                  >
                    <Sparkles size={12} />
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="search-message">
              <SearchX size={26} />
              <strong>搜索暂时断线</strong>
              <p>{error}</p>
            </div>
          ) : null}

          {!error && hasQuery && !loading && results.length === 0 ? (
            <div className="search-message">
              <SearchX size={26} />
              <strong>没有找到「{query.trim()}」</strong>
              <p>换一个关键词，或试试作品的原名 / 英文名。</p>
            </div>
          ) : null}

          {!error && results.length > 0 ? (
            <div className="search-results">
              <div className="search-results-head">
                <span className="mono-label">SEARCH RESULTS</span>
                <span>{results.length} 条结果</span>
              </div>
              {results.map((item) => {
                const meta = CATEGORY_META[item.category];
                return (
                  <a
                    key={item.id}
                    href={item.source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="search-result"
                    data-category={item.category}
                    style={{ "--accent": meta.accent, "--accent-soft": meta.accentSoft } as CSSProperties}
                    onClick={onClose}
                  >
                    <div className="search-result-cover">
                      <CoverImage
                        src={item.cover}
                        alt={item.title}
                        category={item.category}
                      />
                    </div>
                    <div className="search-result-copy">
                      <div className="search-result-kicker">
                        <span>{meta.label}</span>
                        <span>{item.sourceLabel ?? item.source.name}</span>
                      </div>
                      <strong>{item.title}</strong>
                      {item.originalTitle ? <em>{item.originalTitle}</em> : null}
                      <p>{item.summary || "点击查看作品详情。"}</p>
                    </div>
                    <div className="search-result-side">
                      <span>
                        {item.dateLabel ??
                          (item.date === "1970-01-01" ? "档期待定" : item.date)}
                      </span>
                      {item.platforms[0] ? <small>{item.platforms[0]}</small> : null}
                      <ArrowUpRight size={14} />
                    </div>
                  </a>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="search-footer">
          <span>
            <CornerDownLeft size={12} />
            点击结果前往来源
          </span>
          <span>数据来自豆瓣 · TVMaze · AniList · Bangumi · Steam</span>
        </div>
      </div>
    </div>
  );
}
