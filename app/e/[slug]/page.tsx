// Public entity profile page — V11 of the Master Spec.
//
// Renders the entity's published profile composed of section blocks.
// SSG-friendly: notFound() when no profile exists, otherwise the page
// is generated on the first request and revalidated every 60 seconds.

import { notFound } from "next/navigation";
import Link from "next/link";
import { getProfileBySlug, visibleSections, type EntityProfile, type ProfileSection } from "@/lib/entity-profile-store";

export const revalidate = 60;

interface Params {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const profile = await getProfileBySlug(slug);
  if (!profile) return { title: "Profile not found — OduDoc" };
  return {
    title: `${profile.displayName} — OduDoc`,
    description: profile.tagline || `${profile.displayName} on OduDoc — verified ${profile.entityKind}.`,
  };
}

export default async function EntityProfilePage({ params }: Params) {
  const { slug } = await params;
  const profile = await getProfileBySlug(slug);
  if (!profile) notFound();

  const sections = visibleSections(profile);
  return (
    <div className="min-h-screen bg-white">
      <ProfileHeader profile={profile} />
      <main>
        {sections.map((s) => (
          <SectionRenderer key={s.id} section={s} profile={profile} />
        ))}
      </main>
      <ProfileFooter profile={profile} />
    </div>
  );
}

function ProfileHeader({ profile }: { profile: EntityProfile }) {
  return (
    <header className="border-b border-gray-100 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          {profile.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.logoUrl} alt="" className="h-9 w-9 rounded-lg object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0F6E56] text-sm font-bold text-white">
              {profile.displayName.charAt(0)}
            </div>
          )}
          <div>
            <p className="text-sm font-bold text-gray-900">{profile.displayName}</p>
            <p className="text-xs text-gray-500">
              {profile.entityKind} · {profile.city || "—"}
              {profile.verifiedAt && <span className="ml-2 text-[#0F6E56]">✓ Verified</span>}
            </p>
          </div>
        </div>
        <Link href="/" className="text-xs font-semibold text-[#0F6E56] hover:underline">
          OduDoc →
        </Link>
      </div>
    </header>
  );
}

function ProfileFooter({ profile }: { profile: EntityProfile }) {
  return (
    <footer className="border-t border-gray-100 bg-gray-50 py-8 text-center text-xs text-gray-500">
      <p>
        {profile.displayName} is listed on{" "}
        <Link href="/" className="font-semibold text-[#0F6E56]">OduDoc</Link>.
        {" "}Every Patient. Every Provider. Everywhere.
      </p>
      <p className="mt-2">
        Profile last updated {new Date(profile.updatedAt).toLocaleDateString()}.
      </p>
    </footer>
  );
}

// ── Section renderers ────────────────────────────────────────────

function SectionRenderer({ section, profile }: { section: ProfileSection; profile: EntityProfile }) {
  switch (section.type) {
    case "hero":           return <HeroSection data={section.data} />;
    case "about":          return <AboutSection data={section.data} />;
    case "services":       return <ServicesSection data={section.data} />;
    case "team":           return <TeamSection data={section.data} />;
    case "contact":        return <ContactSection data={section.data} profile={profile} />;
    case "stats":          return <StatsSection data={section.data} />;
    case "testimonials":   return <TestimonialsSection data={section.data} />;
    case "gallery":        return <GallerySection data={section.data} />;
    case "certifications": return <CertificationsSection data={section.data} />;
    case "products":       return <ProductsSection data={section.data} />;
    case "pricing":        return <PricingSection data={section.data} />;
    case "facilities":     return <ListSection data={section.data} title="Facilities" tone="navy" />;
    case "specialties":    return <ListSection data={section.data} title="Specialties" tone="teal" />;
    case "insurance_panel":return <ListSection data={section.data} title="Insurance panel" tone="navy" />;
    case "research":       return <ListSection data={section.data} title="Research & publications" tone="gold" />;
    case "education":      return <ListSection data={section.data} title="Education & training" tone="teal" />;
    case "press":          return <ListSection data={section.data} title="In the press" tone="gold" />;
    case "faq":            return <FaqSection data={section.data} />;
    case "video":          return <VideoSection data={section.data} />;
    case "cta":            return <CtaSection data={section.data} />;
  }
}

function HeroSection({ data }: { data: Record<string, unknown> }) {
  const d = data as { headline?: string; subheadline?: string; ctaLabel?: string; ctaHref?: string; backgroundUrl?: string };
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#0F6E56] via-[#0A5942] to-[#042C53] py-20 text-white">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: d.backgroundUrl ? `url(${d.backgroundUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }} />
      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{d.headline}</h1>
        {d.subheadline && <p className="mt-4 text-lg text-white/85">{d.subheadline}</p>}
        {d.ctaLabel && d.ctaHref && (
          <Link
            href={d.ctaHref}
            className="mt-8 inline-block rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#0F6E56] shadow-lg hover:bg-gray-100"
          >
            {d.ctaLabel}
          </Link>
        )}
      </div>
    </section>
  );
}

function AboutSection({ data }: { data: Record<string, unknown> }) {
  const d = data as { title?: string; body?: string };
  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h2 className="text-2xl font-bold text-gray-900">{d.title || "About"}</h2>
      <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-gray-700">{d.body}</p>
    </section>
  );
}

function StatsSection({ data }: { data: Record<string, unknown> }) {
  const d = data as { tiles?: { label: string; value: string }[] };
  return (
    <section className="bg-gray-50 py-12">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 px-4 sm:grid-cols-4 sm:px-6">
        {(d.tiles || []).map((t, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 text-center">
            <p className="text-3xl font-extrabold text-[#0F6E56]">{t.value}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-gray-500">{t.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ServicesSection({ data }: { data: Record<string, unknown> }) {
  const d = data as { items?: { name: string; description?: string; price?: string }[] };
  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h2 className="text-2xl font-bold text-gray-900">Services</h2>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {(d.items || []).map((it, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-gray-900">{it.name}</p>
              {it.price && <p className="text-sm font-bold text-[#0F6E56]">{it.price}</p>}
            </div>
            {it.description && <p className="mt-1 text-sm text-gray-600">{it.description}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function ProductsSection({ data }: { data: Record<string, unknown> }) {
  const d = data as { items?: { name: string; description?: string; price?: string; imageUrl?: string }[] };
  return (
    <section className="bg-gray-50 py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <h2 className="text-2xl font-bold text-gray-900">Products</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(d.items || []).map((it, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              {it.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.imageUrl} alt="" className="h-40 w-full object-cover" />
              )}
              <div className="p-4">
                <p className="font-semibold text-gray-900">{it.name}</p>
                {it.description && <p className="mt-1 text-sm text-gray-600">{it.description}</p>}
                {it.price && <p className="mt-2 text-sm font-bold text-[#0F6E56]">{it.price}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection({ data }: { data: Record<string, unknown> }) {
  const d = data as { items?: { name: string; price: string; note?: string }[] };
  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h2 className="text-2xl font-bold text-gray-900">Pricing</h2>
      <ul className="mt-6 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
        {(d.items || []).map((it, i) => (
          <li key={i} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium text-gray-900">{it.name}</p>
              {it.note && <p className="text-xs text-gray-500">{it.note}</p>}
            </div>
            <p className="text-sm font-bold text-[#0F6E56]">{it.price}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TeamSection({ data }: { data: Record<string, unknown> }) {
  const d = data as { items?: { name: string; role: string; photoUrl?: string }[] };
  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h2 className="text-2xl font-bold text-gray-900">Team</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(d.items || []).map((m, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 text-center">
            {m.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.photoUrl} alt={m.name} className="mx-auto h-20 w-20 rounded-full object-cover" />
            ) : (
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#0F6E56] text-2xl font-bold text-white">
                {m.name.charAt(0)}
              </div>
            )}
            <p className="mt-3 font-semibold text-gray-900">{m.name}</p>
            <p className="text-xs text-gray-500">{m.role}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TestimonialsSection({ data }: { data: Record<string, unknown> }) {
  const d = data as { items?: { quote: string; author: string }[] };
  return (
    <section className="bg-gray-50 py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <h2 className="text-2xl font-bold text-gray-900">What patients say</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {(d.items || []).map((t, i) => (
            <blockquote key={i} className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-sm italic text-gray-700">&ldquo;{t.quote}&rdquo;</p>
              <footer className="mt-3 text-xs font-semibold text-gray-500">— {t.author}</footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}

function ListSection({ data, title, tone }: { data: Record<string, unknown>; title: string; tone: "teal" | "navy" | "gold" }) {
  const d = data as { items?: string[] };
  const color = tone === "teal" ? "#0F6E56" : tone === "navy" ? "#042C53" : "#C9A84C";
  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      <div className="mt-6 flex flex-wrap gap-2">
        {(d.items || []).map((it, i) => (
          <span
            key={i}
            className="rounded-full border px-3 py-1.5 text-sm font-medium"
            style={{ borderColor: `${color}40`, color }}
          >
            {it}
          </span>
        ))}
      </div>
    </section>
  );
}

function CertificationsSection({ data }: { data: Record<string, unknown> }) {
  return <ListSection data={data} title="Certifications & accreditations" tone="gold" />;
}

function GallerySection({ data }: { data: Record<string, unknown> }) {
  const d = data as { images?: { url: string; alt?: string }[] };
  return (
    <section className="bg-gray-50 py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <h2 className="text-2xl font-bold text-gray-900">Gallery</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {(d.images || []).map((img, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={img.url} alt={img.alt || ""} className="h-40 w-full rounded-lg object-cover" />
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactSection({ data, profile }: { data: Record<string, unknown>; profile: EntityProfile }) {
  const d = data as { address?: string; phone?: string; email?: string; hoursLabel?: string };
  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h2 className="text-2xl font-bold text-gray-900">Contact</h2>
      <div className="mt-6 space-y-2 text-sm text-gray-700">
        {d.address && <p>📍 {d.address}</p>}
        {d.phone && <p>📞 <a href={`tel:${d.phone}`} className="text-[#0F6E56]">{d.phone}</a></p>}
        {d.email && <p>✉️ <a href={`mailto:${d.email}`} className="text-[#0F6E56]">{d.email}</a></p>}
        {d.hoursLabel && <p>🕐 {d.hoursLabel}</p>}
        {!d.address && !d.phone && !d.email && profile.city && <p>📍 {profile.city}, {profile.country}</p>}
      </div>
    </section>
  );
}

function FaqSection({ data }: { data: Record<string, unknown> }) {
  const d = data as { items?: { q: string; a: string }[] };
  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h2 className="text-2xl font-bold text-gray-900">Frequently asked</h2>
      <div className="mt-6 space-y-3">
        {(d.items || []).map((it, i) => (
          <details key={i} className="rounded-xl border border-gray-200 bg-white p-4">
            <summary className="cursor-pointer font-semibold text-gray-900">{it.q}</summary>
            <p className="mt-2 text-sm text-gray-700">{it.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function VideoSection({ data }: { data: Record<string, unknown> }) {
  const d = data as { embedUrl?: string; caption?: string };
  if (!d.embedUrl) return null;
  return (
    <section className="bg-gray-50 py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-xl bg-black">
          <div className="relative aspect-video">
            <iframe src={d.embedUrl} className="absolute inset-0 h-full w-full" allowFullScreen title={d.caption || "Video"} />
          </div>
        </div>
        {d.caption && <p className="mt-3 text-center text-sm text-gray-600">{d.caption}</p>}
      </div>
    </section>
  );
}

function CtaSection({ data }: { data: Record<string, unknown> }) {
  const d = data as { headline?: string; subheadline?: string; ctaLabel?: string; ctaHref?: string };
  return (
    <section className="bg-gradient-to-br from-[#042C53] to-[#0F6E56] py-16 text-white">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="text-3xl font-bold">{d.headline}</h2>
        {d.subheadline && <p className="mt-3 text-white/85">{d.subheadline}</p>}
        {d.ctaLabel && d.ctaHref && (
          <Link href={d.ctaHref} className="mt-6 inline-block rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#0F6E56] hover:bg-gray-100">
            {d.ctaLabel}
          </Link>
        )}
      </div>
    </section>
  );
}
