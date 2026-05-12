// Org mini-website: /c/<slug>.
//
// Renders a single org's published mini-site. Branding (logo +
// primary color) flows in from /lib/org-branding so the surface
// matches the rest of the org's themed touchpoints (invoice,
// patient file, etc.). Vacancies + courses cross-link in based on
// the org's role.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSiteBySlug } from "@/lib/org-website/store";
import { getOrganizationById } from "@/lib/organizations-store";
import { getBranding } from "@/lib/org-branding/store";
import { listVacancies } from "@/lib/org-vacancies/store";
import { listCourses } from "@/lib/education/store";

interface Params { slug: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const site = getSiteBySlug(slug);
  if (!site) return { title: "Not found", robots: { index: false } };
  const org = getOrganizationById(site.organizationId);
  const title = `${org?.name || "Organization"} on OduDoc`;
  return {
    title,
    description: site.tagline || site.about?.slice(0, 150) || `${org?.name} on OduDoc`,
    alternates: { canonical: `/c/${site.slug}` },
  };
}

export default async function OrgWebsitePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const site = getSiteBySlug(slug);
  if (!site) notFound();
  const org = getOrganizationById(site.organizationId);
  const branding = getBranding(site.organizationId);
  const vacancies = site.showVacancies ? listVacancies({ organizationId: site.organizationId, openOnly: true }).slice(0, 6) : [];
  const courses = site.showCourses ? listCourses({ organizationId: site.organizationId, openOnly: true }).slice(0, 6) : [];

  const primary = branding?.primaryColor || "#4f46e5";
  const displayName = branding?.displayName || org?.name || "Organization";

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Hero */}
      <section className="relative overflow-hidden text-white" style={{ background: `linear-gradient(135deg, ${primary}, #312e81)` }}>
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <div className="flex items-center gap-4">
            {branding?.logoLight && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoLight} alt="" className="h-12 w-auto bg-white/90 rounded-md p-1 object-contain" />
            )}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/80">{org?.country || "OduDoc partner"}</p>
              <h1 className="mt-1 text-3xl font-extrabold sm:text-5xl">{displayName}</h1>
            </div>
          </div>
          {site.tagline && <p className="mt-4 max-w-2xl text-lg text-white/85">{site.tagline}</p>}
          <div className="mt-6 flex flex-wrap gap-3">
            {site.enableBooking && (
              <Link href={`/doctors?org=${site.organizationId}`} className="rounded-xl bg-white dark:bg-slate-900 px-5 py-2.5 text-sm font-bold text-indigo-700 shadow-md">
                Book an appointment
              </Link>
            )}
            {branding?.websiteUrl && (
              <a href={branding.websiteUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-bold text-white backdrop-blur">
                Visit website ↗
              </a>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {site.about && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">About</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-slate-700 dark:text-slate-300">{site.about}</p>
          </section>
        )}

        {site.services.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Services</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {site.services.map((s, i) => (
                <article key={i} className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
                  {s.icon && <p className="text-2xl">{s.icon}</p>}
                  <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-slate-100">{s.title}</h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{s.description}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {site.team.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Team</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {site.team.map((m, i) => (
                <article key={i} className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
                  <div className="flex items-center gap-3">
                    {m.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.photoUrl} alt={m.name} className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-base font-extrabold text-indigo-700">
                        {m.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{m.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{m.role}</p>
                    </div>
                  </div>
                  {m.bio && <p className="mt-2 line-clamp-3 text-xs text-slate-600 dark:text-slate-300">{m.bio}</p>}
                </article>
              ))}
            </div>
          </section>
        )}

        {site.gallery.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Gallery</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {site.gallery.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={url} alt="" className="aspect-[4/3] w-full rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-800" />
              ))}
            </div>
          </section>
        )}

        {vacancies.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Open roles</h2>
              <Link href={`/jobs?orgId=${site.organizationId}`} className="text-sm font-semibold text-indigo-600 hover:underline">All roles →</Link>
            </div>
            <ul className="mt-4 space-y-2">
              {vacancies.map((v) => (
                <li key={v.id} className="rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{v.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{v.kind.replace(/_/g, " ")} · {v.location}</p>
                    </div>
                    {(v.applyUrl || v.contactEmail) && (
                      <a href={v.applyUrl || `mailto:${v.contactEmail}`} target={v.applyUrl ? "_blank" : undefined} rel="noreferrer" className="text-xs font-bold text-indigo-600">Apply →</a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {courses.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Courses</h2>
            </div>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {courses.map((c) => (
                <li key={c.id} className="rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">{c.level} · {c.mode.replace(/_/g, " ")}</p>
                  <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">{c.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{c.duration || ""}{c.feeRupees ? ` · ₹${c.feeRupees.toLocaleString("en-IN")}` : ""}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">{c.description}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {site.contactBlock && (
          <section className="mb-10 rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Contact</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">{site.contactBlock}</p>
          </section>
        )}

        <p className="mt-12 text-center text-[10px] uppercase tracking-widest text-slate-400">
          {branding?.invoiceFooter ? branding.invoiceFooter : `Powered by OduDoc`}
        </p>
      </div>
    </main>
  );
}
