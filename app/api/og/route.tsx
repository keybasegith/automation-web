import { ImageResponse } from "next/og";

export async function GET(request: Request) {
  const title = (new URL(request.url).searchParams.get("title") || "Independent Wealth Management in Canada").slice(0, 150);
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#0a1f33", color: "white", fontFamily: "sans-serif", borderBottom: "18px solid #00898a" }}>
      <div style={{ display: "flex", fontSize: 30, letterSpacing: 3 }}>KEYBASE FINANCIAL GROUP</div>
      <div style={{ display: "flex", fontSize: title.length > 90 ? 48 : 60, lineHeight: 1.15, maxWidth: 1040 }}>{title}</div>
      <div style={{ display: "flex", fontSize: 24, color: "#a9d5d5" }}>www.keybase.com</div>
    </div>,
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=86400", "X-Robots-Tag": "noindex" } },
  );
}
