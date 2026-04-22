// Apple touch icon (180×180). Shown when iOS users add to home screen.

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
          background: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 55%, #8b5cf6 100%)",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "112px",
          fontWeight: 800,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        O
      </div>
    ),
    { ...size }
  );
}
