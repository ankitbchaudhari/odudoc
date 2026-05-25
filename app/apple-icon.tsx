// Apple touch icon (180×180). Shown when iOS users add to home screen.
// Mirrors the brand-green medical-cross treatment used in icon.tsx
// so the home-screen tile and the browser favicon match.

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          // iOS rounds the corners itself; keep a small radius so
          // browsers that don't (Android-as-a-fallback) still get a
          // tile-shaped icon, not a square.
          borderRadius: "36px",
          background: "linear-gradient(135deg, #0F6E56 0%, #1D9E75 100%)",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width="120"
          height="120"
          viewBox="0 0 24 24"
          fill="white"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="9.5" y="3" width="5" height="18" rx="1.2" />
          <rect x="3" y="9.5" width="18" height="5" rx="1.2" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
