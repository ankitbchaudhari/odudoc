// Dynamic Open Graph image — served at /opengraph-image. Next picks this up
// automatically for the root route; per-route pages can co-locate their own
// opengraph-image.tsx to override.
//
// Returns a 1200×630 PNG at request time. No static asset needed.
//
// Brand alignment: this used to render a plain "O" letter on a sky-blue /
// indigo / violet gradient — none of which matched the canonical OduDoc
// brand. Now uses the emerald → teal gradient from components/Logo.tsx
// and renders the actual medical-cross icon, so the share-card visual
// matches every other OduDoc surface.

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "OduDoc — Healthcare, reimagined";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          // V4 §1.2 palette — primary teal to secondary navy. Solid
          // anchor points; the gradient stays purely as a background
          // accent and the brand wordmark + cross are crisp solids on
          // top per V4 §1.3 (no recolouring outside the variants).
          background:
            "linear-gradient(135deg, #0F6E56 0%, #042C53 100%)",
          color: "white",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "40px",
          }}
        >
          {/* Brand mark — rounded white-tint square containing the
              white medical cross. Same proportions as the canonical
              Logo (12:40 cross over a 64-unit square, scaled up). */}
          <div
            style={{
              position: "relative",
              width: "84px",
              height: "84px",
              borderRadius: "20px",
              background: "rgba(255,255,255,0.18)",
              border: "2px solid rgba(255,255,255,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Vertical bar of the cross */}
            <div
              style={{
                position: "absolute",
                width: "18px",
                height: "52px",
                background: "#ffffff",
                borderRadius: "5px",
              }}
            />
            {/* Horizontal bar of the cross */}
            <div
              style={{
                position: "absolute",
                width: "52px",
                height: "18px",
                background: "#ffffff",
                borderRadius: "5px",
              }}
            />
          </div>
          <div style={{ fontSize: "44px", fontWeight: 800, letterSpacing: "-0.03em" }}>
            OduDoc
          </div>
        </div>
        <div
          style={{
            fontSize: "72px",
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            maxWidth: "960px",
          }}
        >
          Online doctor consultations, lab tests & hospital software.
        </div>
        <div
          style={{
            marginTop: "36px",
            fontSize: "30px",
            opacity: 0.92,
            maxWidth: "900px",
            lineHeight: 1.3,
          }}
        >
          Verified specialists. Secure video visits. One platform for patients, clinics, and hospitals.
        </div>
        {/* V4 tagline — "Every Patient. Every Provider. Everywhere." */}
        <div
          style={{
            marginTop: "28px",
            fontSize: "22px",
            opacity: 0.85,
            fontWeight: 600,
            letterSpacing: "0.02em",
          }}
        >
          Every Patient. Every Provider. Everywhere.
        </div>
        <div
          style={{
            position: "absolute",
            bottom: "56px",
            right: "80px",
            fontSize: "26px",
            opacity: 0.85,
            fontWeight: 600,
          }}
        >
          www.odudoc.com
        </div>
      </div>
    ),
    { ...size }
  );
}
