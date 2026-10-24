import Link from "next/link";
import { ArrowLeft, Radar } from "lucide-react";

export default function NotFound() {
  return (
    <main className="status-page">
      <div className="status-card">
        <div className="status-icon">
          <Radar size={23} />
        </div>
        <span className="section-kicker">404 / OFF RADAR</span>
        <h1>这条时间线不存在</h1>
        <p>页面可能已经下映，或者链接里的日期不太对。</p>
        <div className="status-actions">
          <Link href="/" className="empty-primary">
            <ArrowLeft size={14} />
            回到今天
          </Link>
        </div>
      </div>
    </main>
  );
}
