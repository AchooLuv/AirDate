import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "AirDate — film, series, anime and game release calendar";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          padding: "58px 64px",
          color: "#f5f6fa",
          background:
            "radial-gradient(circle at 12% 8%, rgba(210,140,255,.22), transparent 42%), radial-gradient(circle at 92% 92%, rgba(90,182,255,.18), transparent 42%), #07080d",
          fontFamily: "sans-serif",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.22,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.07) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              width: 48,
              height: 48,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 14,
              background: "linear-gradient(135deg,#ffd68a,#d28cff 48%,#5ab6ff)",
              color: "#08090e",
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            ▶
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 29, fontWeight: 700, letterSpacing: -1.4 }}>
              AirDate
            </span>
            <span
              style={{
                fontSize: 10,
                letterSpacing: 4,
                color: "#8f95a8",
              }}
            >
              RELEASE RADAR
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <span
            style={{
              fontSize: 14,
              letterSpacing: 5,
              color: "#d28cff",
            }}
          >
            EVERY RELEASE. ONE TIMELINE.
          </span>
          <span
            style={{
              maxWidth: 880,
              fontSize: 86,
              fontWeight: 650,
              lineHeight: 1.02,
              letterSpacing: -5,
            }}
          >
            Every release.
            <br />
            One timeline.
          </span>
          <span style={{ fontSize: 21, color: "#a3a8b9" }}>
            Film · Series · Anime · Games — in Beijing time.
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 10 }}>
            {["#f7b955", "#5ab6ff", "#d28cff", "#5de2a5"].map((color) => (
              <span
                key={color}
                style={{
                  display: "flex",
                  width: 62,
                  height: 5,
                  background: color,
                  borderRadius: 99,
                }}
              />
            ))}
          </div>
          <span
            style={{
              fontSize: 13,
              letterSpacing: 2,
              color: "#686e82",
            }}
          >
            AIRDATE.VERCEL.APP
          </span>
        </div>
      </div>
    ),
    size,
  );
}
