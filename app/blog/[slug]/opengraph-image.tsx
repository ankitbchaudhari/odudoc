// Per-post OG image. Rendered on demand at edge — no build-time cost.
//
// Dynamic OG images lift social click-through meaningfully over a generic
// site-wide card, because the preview shows the actual article title +
// category rather than a stock graphic. The fallback is the root OG image,
// so if the DB can't be reached we still have something valid.

import { ImageResponse } from "next/og";
import { getPostBySlug } from "@/lib/blog-store";

export const runtime = "nodejs"; // needs DB access, so run in node not edge
export const alt = "OduDoc Blog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Soft category → accent gradient. Keeps the card on-brand while giving each
// category a distinct feel in someone's Twitter timeline.
function gradientFor(category: string): string {
  switch ((category || "").toLowerCase()) {
    case "wellness":
      return "linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)";
    case "nutrition":
      return "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)";
    case "mental health":
      return "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)";
    case "fitness":
      return "linear-gradient(135deg, #f43f5e 0%, #f59e0b 100%)";
    case "medical tips":
      return "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)";
    case "news":
      return "linear-gradient(135deg, #475569 0%, #0f172a 100%)";
    default:
      return "linear-gradient(135deg, #0ea5e9 0%, #6366f1 55%, #8b5cf6 100%)";
  }
}

// Hard cap headline at ~120 chars so the 72px font doesn't overflow the
// 1200×630 canvas. Word-boundary trim to avoid ugly mid-word cuts.
function truncate(s: string, max: number): string {
  if (!s || s.length <= max) return s || "";
  const cut = s.slice(0, max + 1);
  const sp = cut.lastIndexOf(" ");
  return (sp > 40 ? cut.slice(0, sp) : s.slice(0, max)).replace(/[.,;:—–-]+$/, "").trim() + "…";
}

export default async function BlogPostOgImage(
  { params }: { params: { slug: string } }
) {
  let title = "OduDoc Blog";
  let category = "";
  let author = "OduDoc";
  try {
    const post = await getPostBySlug(params.slug);
    if (post) {
      title = post.title;
      category = post.category;
      author = post.author;
    }
  } catch {
    // Fall through to defaults — rendering an OG image must never throw.
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: gradientFor(category),
          color: "white",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Header row: logo + category chip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "14px",
                background: "rgba(255,255,255,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
                fontWeight: 700,
              }}
            >
              O
            </div>
            <div style={{ fontSize: "32px", fontWeight: 700 }}>OduDoc</div>
          </div>
          {category && (
            <div
              style={{
                padding: "10px 22px",
                borderRadius: "999px",
                background: "rgba(0,0,0,0.25)",
                fontSize: "22px",
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {category}
            </div>
          )}
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            fontSize: "66px",
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: "-0.02em",
            maxWidth: "1040px",
          }}
        >
          {truncate(title, 120)}
        </div>

        {/* Footer row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: "24px",
            opacity: 0.92,
          }}
        >
          <div style={{ fontWeight: 600 }}>{author}</div>
          <div style={{ fontWeight: 600 }}>www.odudoc.com</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
