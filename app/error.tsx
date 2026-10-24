"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="status-page">
      <div className="status-card">
        <div className="status-icon">
          <TriangleAlert size={23} />
        </div>
        <span className="section-kicker">SIGNAL LOST</span>
        <h1>这次的雷达暂时失联</h1>
        <p>数据源没有及时回应。可以再试一次，或先回到今天的时间线。</p>
        <div className="status-actions">
          <button type="button" onClick={reset} className="empty-primary">
            <RotateCcw size={14} />
            重新连接
          </button>
          <Link href="/" className="empty-secondary">
            回到今天
          </Link>
        </div>
      </div>
    </main>
  );
}
