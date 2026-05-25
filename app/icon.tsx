// Dynamic favicon — OduDoc medical cross on the brand green.
//
// Next serves this at /icon and uses it for <link rel="icon">, so we
// don't need a static .ico file in /public. ImageResponse rasterises
// the JSX to a 32×32 PNG at request time.

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
          borderRadius: "7px",
          // Brand primary green — matches the Navbar logo + the
          // gradient on the marketing site hero.
          background: "linear-gradient(135deg, #0F6E56 0%, #1D9E75 100%)",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Medical-cross plus sign, drawn at 22×22 so the OS sees a
            crisp shape even at 16×16 favicons (browser tab) and at
            32×32 (bookmark bar). */}
        <svg
          width="22"
          height="22"
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
