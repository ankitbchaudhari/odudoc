import type { MetadataRoute } from "next";
import { getPublicDoctors } from "@/lib/public-doctors";
import { listDoctors as listAdminDoctors } from "@/lib/doctors-store";
import { listPosts } from "@/lib/blog-store";
import { SPECIALTIES } from "@/lib/seo/specialties";
import { CITIES } from "@/lib/seo/cities";
import { SYMPTOMS } from "@/lib/seo/symptoms";
import { CONDITIONS } from "@/lib/seo/conditions";
import { COMPARES } from "@/lib/seo/compares";
import { GLOSSARY } from "@/lib/seo/glossary";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.odudoc.com";

// Static public pages worth indexing. Ordered by launch priority.
const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "daily", priority: 1.0 },
  { path: "/consult", changeFrequency: "daily", priority: 0.95 },
  { path: "/doctors", changeFrequency: "daily", priority: 0.9 },
  { path: "/corporate", changeFrequency: "weekly", priority: 0.9 },
  { path: "/for-doctors", changeFrequency: "weekly", priority: 0.9 },
  { path: "/for-doctors/guide", changeFrequency: "monthly", priority: 0.75 },
  { path: "/for-clinics", changeFrequency: "weekly", priority: 0.9 },
  { path: "/pricing", changeFrequency: "weekly", priority: 0.85 },
  { path: "/tests", changeFrequency: "weekly", priority: 0.8 },
  { path: "/surgeries", changeFrequency: "weekly", priority: 0.75 },
  { path: "/specialty", changeFrequency: "weekly", priority: 0.85 },
  { path: "/doctors-in", changeFrequency: "weekly", priority: 0.8 },
  { path: "/symptoms", changeFrequency: "weekly", priority: 0.8 },
  { path: "/conditions", changeFrequency: "weekly", priority: 0.8 },
  { path: "/compare", changeFrequency: "monthly", priority: 0.7 },
  { path: "/directory", changeFrequency: "weekly", priority: 0.7 },
  { path: "/blog", changeFrequency: "daily", priority: 0.8 },
  { path: "/doctors-az", changeFrequency: "weekly", priority: 0.75 },
  { path: "/glossary", changeFrequency: "weekly", priority: 0.7 },
  { path: "/about", changeFrequency: "monthly", priority: 0.6 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.6 },
  { path: "/careers", changeFrequency: "weekly", priority: 0.6 },
  { path: "/help", changeFrequency: "weekly", priority: 0.6 },
  { path: "/faq", changeFrequency: "weekly", priority: 0.6 },
  { path: "/testimonials", changeFrequency: "monthly", priority: 0.5 },
  { path: "/reach", changeFrequency: "monthly", priority: 0.5 },
  { path: "/gallery", changeFrequency: "monthly", priority: 0.5 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Freshness signal for dynamic hubs — if we know when the most recent blog
  // post or doctor edit happened, use that on the index/listing pages rather
  // than a uniform `now`. Crawlers treat a drifting lastModified on pages
  // that never change as noise.
  let latestBlogAt: Date | null = null;
  let latestDoctorAt: Date | null = null;
  try {
    const posts = await listPosts({ onlyPublished: true });
    for (const p of posts) {
      const t = p.updatedAt ? new Date(p.updatedAt) : null;
      if (t && (!latestBlogAt || t > latestBlogAt)) latestBlogAt = t;
    }
  } catch {
    // ignore
  }
  let adminDoctors: Awaited<ReturnType<typeof listAdminDoctors>> = [];
  try {
    adminDoctors = await listAdminDoctors();
    for (const d of adminDoctors) {
      const t = d.updatedAt ? new Date(d.updatedAt) : null;
      if (t && (!latestDoctorAt || t > latestDoctorAt)) latestDoctorAt = t;
    }
  } catch {
    // ignore
  }
  const doctorUpdatedById = new Map<string, Date>();
  for (const d of adminDoctors) {
    if (d.updatedAt) doctorUpdatedById.set(d.id, new Date(d.updatedAt));
  }

  // Per-path override for lastmod on hubs that depend on live data.
  const dynamicLastMod: Record<string, Date | null> = {
    "/": latestBlogAt || latestDoctorAt,
    "/blog": latestBlogAt,
    "/doctors": latestDoctorAt,
    "/doctors-az": latestDoctorAt,
    "/directory": latestDoctorAt,
  };

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: dynamicLastMod[r.path] || now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // Programmatic SEO — one URL per specialty.
  const specialtyEntries: MetadataRoute.Sitemap = SPECIALTIES.map((s) => ({
    url: `${SITE_URL}/specialty/${s.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Programmatic SEO — one URL per city.
  const cityEntries: MetadataRoute.Sitemap = CITIES.map((c) => ({
    url: `${SITE_URL}/doctors-in/${c.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));

  // Programmatic SEO — one URL per symptom.
  const symptomEntries: MetadataRoute.Sitemap = SYMPTOMS.map((s) => ({
    url: `${SITE_URL}/symptoms/${s.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  // Programmatic SEO — one URL per medical condition.
  const conditionEntries: MetadataRoute.Sitemap = CONDITIONS.map((c) => ({
    url: `${SITE_URL}/conditions/${c.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // Programmatic SEO — one URL per comparison.
  const compareEntries: MetadataRoute.Sitemap = COMPARES.map((c) => ({
    url: `${SITE_URL}/compare/${c.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Programmatic SEO — specialty × city matrix (long-tail).
  // We emit BOTH URL shapes: the legacy /specialty/[slug]/in/[city]
  // form and the newer /doctors/[city]/[specialty] form. Search
  // engines pick whichever ranks better; canonical tags on each
  // page point at the chosen shape going forward.
  const matrixEntries: MetadataRoute.Sitemap = [];
  for (const s of SPECIALTIES) {
    for (const c of CITIES) {
      matrixEntries.push({
        url: `${SITE_URL}/specialty/${s.slug}/in/${c.slug}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      });
      matrixEntries.push({
        url: `${SITE_URL}/doctors/${c.slug}/${s.slug}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      });
    }
  }

  // Programmatic SEO — one URL per glossary term.
  const glossaryEntries: MetadataRoute.Sitemap = GLOSSARY.map((g) => ({
    url: `${SITE_URL}/glossary/${g.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Doctor profiles — one URL per active doctor.
  let doctorEntries: MetadataRoute.Sitemap = [];
  try {
    doctorEntries = getPublicDoctors()
      .filter((d) => d.available)
      .map((d) => ({
        url: `${SITE_URL}/doctors/${d.id}`,
        lastModified: doctorUpdatedById.get(d.id) || now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
  } catch {
    // Don't fail the sitemap if the doctor store can't be read.
  }

  // Published blog posts.
  let blogEntries: MetadataRoute.Sitemap = [];
  try {
    const posts = await listPosts({ onlyPublished: true });
    blogEntries = posts.map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
      changeFrequency: "weekly" as const,
      priority: 0.65,
    }));
  } catch {
    // Blog table may not exist yet on a fresh deploy.
  }

  return [
    ...staticEntries,
    ...specialtyEntries,
    ...cityEntries,
    ...symptomEntries,
    ...conditionEntries,
    ...compareEntries,
    ...matrixEntries,
    ...glossaryEntries,
    ...doctorEntries,
    ...blogEntries,
  ];
}
