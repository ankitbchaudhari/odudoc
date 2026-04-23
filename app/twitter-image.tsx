// Twitter card image — same composition as opengraph-image. Next requires
// `runtime`, `alt`, `size`, `contentType` to be declared as string literals
// in *this* file (re-exports aren't statically analysed, so the edge runtime
// wouldn't be picked up and the build-time prerender would hit @vercel/og's
// Node path and fail with "Invalid URL").

import OgImage from "./opengraph-image";

export const runtime = "edge";
export const alt = "OduDoc — Healthcare, reimagined";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default OgImage;
