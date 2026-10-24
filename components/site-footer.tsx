import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { GithubIcon } from "@/components/github-icon";
import { GITHUB_URL, SITE_DESCRIPTION } from "@/lib/constants";

const SOURCES = [
  { name: "豆瓣", href: "https://movie.douban.com/" },
  { name: "TVMaze", href: "https://www.tvmaze.com/" },
  { name: "AniList", href: "https://anilist.co/" },
  { name: "Bangumi", href: "https://bgm.tv/" },
  { name: "Steam", href: "https://store.steampowered.com/" },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div className="footer-brand">
          <Link href="/" className="brand">
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
          <p>{SITE_DESCRIPTION}</p>
          <span className="footer-stamp">MADE FOR PEOPLE WHO WAIT FOR RELEASES.</span>
        </div>

        <div className="footer-links">
          <span className="mono-label">EXPLORE</span>
          <Link href="/">今日时间线</Link>
          <Link href="#upcoming">即将到来</Link>
          <Link href="#sources">数据源</Link>
          <a href={`${GITHUB_URL}#readme`} target="_blank" rel="noreferrer">
            README
            <ArrowUpRight size={11} />
          </a>
        </div>

        <div className="footer-links">
          <span className="mono-label">SOURCES</span>
          {SOURCES.map((source) => (
            <a key={source.name} href={source.href} target="_blank" rel="noreferrer">
              {source.name}
              <ArrowUpRight size={11} />
            </a>
          ))}
        </div>

        <div className="footer-github">
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="footer-github-link">
            <GithubIcon size={17} />
            <span>
              <strong>Open source</strong>
              <small>AchooLuv / AirDate</small>
            </span>
            <ArrowUpRight size={14} />
          </a>
          <p>数据来自公开接口，时间与价格以官方最终信息为准。</p>
        </div>
      </div>

      <div className="shell footer-bottom">
        <span>© {new Date().getFullYear()} AirDate</span>
        <span>北京时间 / UTC+8</span>
        <span>Built with Next.js · SSR · Edge-ready</span>
      </div>
    </footer>
  );
}
