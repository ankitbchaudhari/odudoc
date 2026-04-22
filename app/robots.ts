import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.odudoc.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/api",
          "/api/",
          "/dashboard",
          "/dashboard/",
          "/auth",
          "/auth/",
          "/checkout",
          "/payment",
          "/cart",
          "/profile",
          "/cms",
          "/drive",
        ],
      },
      // GPTBot and other aggressive crawlers — allow but throttle via robots.
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: ["/admin", "/api", "/dashboard", "/auth"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
