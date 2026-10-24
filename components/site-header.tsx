"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { GithubIcon } from "@/components/github-icon";
import { GITHUB_URL } from "@/lib/constants";

export function SiteHeader({ onOpenSearch }: { onOpenSearch: () => void }) {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link href="/" className="brand" aria-label="AirDate 首页">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="M9 6.8v10.4L17 12 9 6.8Z" fill="currentColor" />
            </svg>
          </span>
          <span className="brand-text">
            <strong>AirDate</strong>
            <span>RELEASE RADAR</span>
          </span>
        </Link>

        <nav className="header-nav" aria-label="主导航">
          <Link href="/" className="nav-link is-active">
            时间线
          </Link>
          <Link href="#upcoming" className="nav-link">
            即将到来
          </Link>
          <Link href="#sources" className="nav-link">
            数据源
          </Link>
        </nav>

        <div className="header-actions">
          <button
            type="button"
            className="search-trigger"
            onClick={onOpenSearch}
            aria-label="搜索电影、剧集、番剧和游戏"
          >
            <Search size={15} aria-hidden="true" />
            <span className="search-trigger-label">搜索全站</span>
            <kbd className="search-kbd">
              <span className="kbd-command">⌘</span>K
            </kbd>
          </button>
          <a
            className="icon-link"
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="在 GitHub 查看 AirDate"
          >
            <GithubIcon size={17} />
          </a>
        </div>
      </div>
    </header>
  );
}
