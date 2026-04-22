// Dynamic favicon. Next serves this at /icon (and uses it for the <link rel="icon">)
// so we don't need a static .ico file in /public.

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "8px",
          background: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "22px",
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
