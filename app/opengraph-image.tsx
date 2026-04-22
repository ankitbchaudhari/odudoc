// Dynamic Open Graph image — served at /opengraph-image. Next picks this up
// automatically for the root route; per-route pages can co-locate their own
// opengraph-image.tsx to override.
//
// Returns a 1200×630 PNG at request time. No static asset needed.

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
          background:
            "linear-gradient(135deg, #0ea5e9 0%, #6366f1 55%, #8b5cf6 100%)",
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
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "18px",
              background: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "40px",
              fontWeight: 700,
            }}
          >
            O
          </div>
          <div style={{ fontSize: "40px", fontWeight: 700, letterSpacing: "-0.02em" }}>
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
