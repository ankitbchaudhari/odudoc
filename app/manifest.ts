import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OduDoc — Healthcare, reimagined",
    short_name: "OduDoc",
    description:
      "Book video consultations, order lab tests, and manage hospitals on OduDoc.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0ea5e9",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
    categories: ["health", "medical", "lifestyle"],
  };
}
