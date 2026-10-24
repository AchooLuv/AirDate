export default function Loading() {
  return (
    <div className="app-loading">
      <div className="loading-brand">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M9 6.8v10.4L17 12 9 6.8Z" fill="currentColor" />
          </svg>
        </span>
        <div>
          <strong>AirDate</strong>
          <span>TUNING THE RADAR…</span>
        </div>
      </div>
      <div className="loading-bar">
        <span />
      </div>
    </div>
  );
}
