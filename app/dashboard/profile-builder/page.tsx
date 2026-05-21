"use client";

// V11 Profile Editor — entity-side admin to compose their public
// /e/[slug] page.
//
// Functional MVP: form for the page-level fields (slug, displayName,
// tagline, logo, hero, location, status) and a list editor for
// sections. Each section type renders the appropriate fields. Save
// either as draft (private) or published (visible to the public).
//
// Drag-to-reorder is intentionally NOT in this commit — keyboard
// up/down buttons reorder rows, which is enough for the MVP and
// avoids dragging-on-mobile complexity.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PhotoUpload from "@/components/PhotoUpload";

type SectionType =
  | "hero" | "about" | "services" | "team" | "contact" | "stats"
  | "testimonials" | "gallery" | "certifications" | "products"
  | "pricing" | "facilities" | "specialties" | "insurance_panel"
  | "research" | "education" | "press" | "faq" | "video" | "cta";

interface ProfileSection {
  id: string;
  type: SectionType;
  visible: boolean;
  data: Record<string, unknown>;
}
interface Profile {
  slug: string;
  displayName: string;
  tagline?: string;
  logoUrl?: string;
  heroImageUrl?: string;
  city?: string;
  country?: string;
  status: "draft" | "published" | "featured";
  sections: ProfileSection[];
}

const SECTION_LABELS: Record<SectionType, string> = {
  hero: "Hero banner",
  about: "About",
  services: "Services",
  team: "Team",
  contact: "Contact",
  stats: "Stats",
  testimonials: "Testimonials",
  gallery: "Gallery",
  certifications: "Certifications",
  products: "Products",
  pricing: "Pricing",
  facilities: "Facilities",
  specialties: "Specialties",
  insurance_panel: "Insurance panel",
  research: "Research",
  education: "Education",
  press: "Press",
  faq: "FAQ",
  video: "Video",
  cta: "Call to action",
};

const ALL_SECTION_TYPES = Object.keys(SECTION_LABELS) as SectionType[];

function newSection(type: SectionType): ProfileSection {
  return {
    id: `sec_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    type,
    visible: true,
    data: defaultDataForType(type),
  };
}

function defaultDataForType(type: SectionType): Record<string, unknown> {
  switch (type) {
    case "hero":           return { headline: "Your headline here", subheadline: "", ctaLabel: "", ctaHref: "" };
    case "about":          return { title: "About", body: "" };
    case "services":       return { items: [{ name: "", description: "", price: "" }] };
    case "team":           return { items: [{ name: "", role: "", photoUrl: "" }] };
    case "contact":        return { address: "", phone: "", email: "", hoursLabel: "" };
    case "stats":          return { tiles: [{ label: "", value: "" }] };
    case "testimonials":   return { items: [{ quote: "", author: "" }] };
    case "gallery":        return { images: [] };
    case "certifications": return { items: [] };
    case "products":       return { items: [{ name: "", description: "", price: "", imageUrl: "" }] };
    case "pricing":        return { items: [{ name: "", price: "", note: "" }] };
    case "facilities":     return { items: [] };
    case "specialties":    return { items: [] };
    case "insurance_panel":return { items: [] };
    case "research":       return { items: [] };
    case "education":      return { items: [] };
    case "press":          return { items: [] };
    case "faq":            return { items: [{ q: "", a: "" }] };
    case "video":          return { embedUrl: "", caption: "" };
    case "cta":            return { headline: "", subheadline: "", ctaLabel: "", ctaHref: "" };
  }
}

export default function ProfileBuilderPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/entity-profile/me", { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setProfile(d.profile || newBlankProfile());
    } else {
      setProfile(newBlankProfile());
    }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const r = await fetch("/api/entity-profile/me", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(profile),
      });
      const j = await r.json();
      if (!r.ok) {
        setSaveMsg({ ok: false, text: j.error || "Save failed" });
        return;
      }
      setProfile(j.profile);
      setSaveMsg({ ok: true, text: profile.status === "published" ? "Published." : "Saved as draft." });
    } catch {
      setSaveMsg({ ok: false, text: "Network error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile) return <div className="p-6 text-sm text-gray-500">Loading profile editor…</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile builder</h1>
          <p className="mt-1 text-sm text-gray-600">
            Compose the public page at{" "}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">/e/{profile.slug || "your-slug"}</code>
            {profile.status === "published" && (
              <Link href={`/e/${profile.slug}`} target="_blank" className="ml-2 text-[#0F6E56] underline">
                View live →
              </Link>
            )}
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-[#0F6E56] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0A5942] disabled:opacity-60"
        >
          {saving ? "Saving…" : profile.status === "published" ? "Save & re-publish" : "Save"}
        </button>
      </div>

      {saveMsg && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${saveMsg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          {saveMsg.text}
        </div>
      )}

      {/* Page-level fields */}
      <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">Page settings</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <LabeledInput label="Slug (URL)" value={profile.slug} onChange={(v) => setProfile({ ...profile, slug: v.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} />
          <LabeledInput label="Display name" value={profile.displayName} onChange={(v) => setProfile({ ...profile, displayName: v })} />
          <LabeledInput label="Tagline (optional)" value={profile.tagline || ""} onChange={(v) => setProfile({ ...profile, tagline: v })} />
          <LabeledInput label="City" value={profile.city || ""} onChange={(v) => setProfile({ ...profile, city: v })} />
          <LabeledInput label="Country" value={profile.country || ""} onChange={(v) => setProfile({ ...profile, country: v })} />
          <div>
            <label className="block text-xs font-semibold text-gray-600">Visibility</label>
            <select
              value={profile.status}
              onChange={(e) => setProfile({ ...profile, status: e.target.value as Profile["status"] })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="draft">Draft (private)</option>
              <option value="published">Published (public at /e/{profile.slug})</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-6 pt-3">
          <div>
            <p className="mb-1 text-xs font-semibold text-gray-600">Logo</p>
            <PhotoUpload
              subject="entity-logo"
              subjectId={profile.slug || "draft"}
              initialUrl={profile.logoUrl}
              onUploaded={(url) => setProfile({ ...profile, logoUrl: url })}
              shape="square"
              size={80}
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold text-gray-600">Hero image</p>
            <PhotoUpload
              subject="entity-hero"
              subjectId={profile.slug || "draft"}
              initialUrl={profile.heroImageUrl}
              onUploaded={(url) => setProfile({ ...profile, heroImageUrl: url })}
              shape="square"
              size={140}
            />
          </div>
        </div>
      </section>

      {/* Section list */}
      <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">Sections</h2>
          <AddSectionMenu onAdd={(t) => setProfile({ ...profile, sections: [...profile.sections, newSection(t)] })} />
        </div>

        {profile.sections.length === 0 ? (
          <p className="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
            No sections yet. Add one above to start composing your page.
          </p>
        ) : (
          <ul className="space-y-2">
            {profile.sections.map((sec, idx) => (
              <li key={sec.id} className="rounded-xl border border-gray-200 bg-white">
                <header className="flex items-center justify-between gap-2 px-3 py-2">
                  <button
                    onClick={() => setOpenSectionId(openSectionId === sec.id ? null : sec.id)}
                    className="flex flex-1 items-center gap-2 text-left text-sm font-semibold text-gray-800"
                  >
                    <span className="text-gray-400">{idx + 1}.</span>
                    {SECTION_LABELS[sec.type]}
                    {!sec.visible && <span className="text-xs text-gray-400">(hidden)</span>}
                  </button>
                  <div className="flex items-center gap-1 text-xs">
                    <SmallBtn onClick={() => moveSection(profile, setProfile, idx, -1)} disabled={idx === 0}>↑</SmallBtn>
                    <SmallBtn onClick={() => moveSection(profile, setProfile, idx, 1)} disabled={idx === profile.sections.length - 1}>↓</SmallBtn>
                    <SmallBtn onClick={() => setProfile({ ...profile, sections: profile.sections.map((s) => s.id === sec.id ? { ...s, visible: !s.visible } : s) })}>
                      {sec.visible ? "Hide" : "Show"}
                    </SmallBtn>
                    <SmallBtn tone="danger" onClick={() => { if (confirm("Remove this section?")) setProfile({ ...profile, sections: profile.sections.filter((s) => s.id !== sec.id) }); }}>×</SmallBtn>
                  </div>
                </header>
                {openSectionId === sec.id && (
                  <div className="border-t border-gray-100 p-3">
                    <SectionDataEditor
                      section={sec}
                      onChange={(data) => setProfile({
                        ...profile,
                        sections: profile.sections.map((s) => s.id === sec.id ? { ...s, data } : s),
                      })}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function newBlankProfile(): Profile {
  return {
    slug: "",
    displayName: "",
    status: "draft",
    sections: [newSection("hero"), newSection("about"), newSection("contact")],
  };
}

function moveSection(p: Profile, set: (next: Profile) => void, idx: number, dir: -1 | 1) {
  const next = [...p.sections];
  const t = next[idx + dir];
  next[idx + dir] = next[idx];
  next[idx] = t;
  set({ ...p, sections: next });
}

function AddSectionMenu({ onAdd }: { onAdd: (t: SectionType) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg bg-[#0F6E56] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0A5942]"
      >
        + Add section
      </button>
      {open && (
        <div
          className="absolute right-0 z-10 mt-1 max-h-72 w-56 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
          onMouseLeave={() => setOpen(false)}
        >
          {ALL_SECTION_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => { onAdd(t); setOpen(false); }}
              className="block w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              {SECTION_LABELS[t]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
    </div>
  );
}

function SmallBtn({ children, onClick, disabled, tone }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; tone?: "default" | "danger" }) {
  const cls = tone === "danger"
    ? "rounded border border-rose-200 bg-rose-50 px-2 py-1 text-rose-700 hover:bg-rose-100"
    : "rounded border border-gray-200 bg-white px-2 py-1 text-gray-700 hover:bg-gray-50";
  return <button onClick={onClick} disabled={disabled} className={`${cls} disabled:opacity-40`}>{children}</button>;
}

// ── Section-specific data editors ────────────────────────────────

function SectionDataEditor({ section, onChange }: { section: ProfileSection; onChange: (data: Record<string, unknown>) => void }) {
  const d = section.data;
  const t = section.type;

  // Single-string-field types
  const stringFields: Partial<Record<SectionType, string[]>> = {
    hero:    ["headline", "subheadline", "ctaLabel", "ctaHref"],
    about:   ["title", "body"],
    contact: ["address", "phone", "email", "hoursLabel"],
    video:   ["embedUrl", "caption"],
    cta:     ["headline", "subheadline", "ctaLabel", "ctaHref"],
  };

  if (stringFields[t]) {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {stringFields[t]!.map((field) => (
          <div key={field} className={field === "body" ? "sm:col-span-2" : ""}>
            <label className="block text-xs font-semibold text-gray-600">{field}</label>
            {field === "body" ? (
              <textarea
                value={String(d[field] ?? "")}
                onChange={(e) => onChange({ ...d, [field]: e.target.value })}
                rows={5}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            ) : (
              <input
                value={String(d[field] ?? "")}
                onChange={(e) => onChange({ ...d, [field]: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  // Pill-list types (facilities, specialties, insurance_panel,
  // certifications, research, education, press) — { items: string[] }
  const pillTypes: SectionType[] = ["facilities", "specialties", "insurance_panel", "certifications", "research", "education", "press"];
  if (pillTypes.includes(t)) {
    const items = (d.items as string[]) || [];
    return (
      <PillListEditor items={items} onChange={(next) => onChange({ ...d, items: next })} />
    );
  }

  // Stats — { tiles: {label, value}[] }
  if (t === "stats") {
    const tiles = (d.tiles as { label: string; value: string }[]) || [];
    return (
      <ArrayEditor
        items={tiles}
        fields={[{ key: "label", label: "Label" }, { key: "value", label: "Value" }]}
        onChange={(next) => onChange({ ...d, tiles: next })}
        addLabel="+ Add stat"
        emptyItem={{ label: "", value: "" }}
      />
    );
  }

  // Generic items[] structures
  const arrayShapes: Partial<Record<SectionType, { fields: { key: string; label: string }[]; emptyItem: Record<string, string> }>> = {
    services:     { fields: [{ key: "name", label: "Name" }, { key: "description", label: "Description" }, { key: "price", label: "Price" }], emptyItem: { name: "", description: "", price: "" } },
    products:     { fields: [{ key: "name", label: "Name" }, { key: "description", label: "Description" }, { key: "price", label: "Price" }, { key: "imageUrl", label: "Image URL" }], emptyItem: { name: "", description: "", price: "", imageUrl: "" } },
    pricing:      { fields: [{ key: "name", label: "Item" }, { key: "price", label: "Price" }, { key: "note", label: "Note" }], emptyItem: { name: "", price: "", note: "" } },
    team:         { fields: [{ key: "name", label: "Name" }, { key: "role", label: "Role" }, { key: "photoUrl", label: "Photo URL" }], emptyItem: { name: "", role: "", photoUrl: "" } },
    testimonials: { fields: [{ key: "quote", label: "Quote" }, { key: "author", label: "Author" }], emptyItem: { quote: "", author: "" } },
    faq:          { fields: [{ key: "q", label: "Question" }, { key: "a", label: "Answer" }], emptyItem: { q: "", a: "" } },
  };
  const shape = arrayShapes[t];
  if (shape) {
    const items = (d.items as Record<string, string>[]) || [];
    return (
      <ArrayEditor
        items={items}
        fields={shape.fields}
        onChange={(next) => onChange({ ...d, items: next })}
        addLabel="+ Add item"
        emptyItem={shape.emptyItem}
      />
    );
  }

  if (t === "gallery") {
    const images = (d.images as { url: string; alt?: string }[]) || [];
    return (
      <ArrayEditor
        items={images}
        fields={[{ key: "url", label: "Image URL" }, { key: "alt", label: "Alt text" }]}
        onChange={(next) => onChange({ ...d, images: next })}
        addLabel="+ Add image"
        emptyItem={{ url: "", alt: "" }}
      />
    );
  }

  return <p className="text-xs text-gray-500">No editor for this section type yet — edit via API directly.</p>;
}

function PillListEditor({ items, onChange }: { items: string[]; onChange: (next: string[]) => void }) {
  const [draft, setDraft] = useState("");
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {items.map((it, i) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs">
            {it}
            <button onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-rose-600">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              onChange([...items, draft.trim()]);
              setDraft("");
            }
          }}
          placeholder="Type and press Enter…"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
        />
        <button
          onClick={() => { if (draft.trim()) { onChange([...items, draft.trim()]); setDraft(""); } }}
          className="rounded-lg bg-[#0F6E56] px-3 py-1.5 text-xs font-semibold text-white"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function ArrayEditor({
  items, fields, onChange, addLabel, emptyItem,
}: {
  items: Record<string, string>[];
  fields: { key: string; label: string }[];
  onChange: (next: Record<string, string>[]) => void;
  addLabel: string;
  emptyItem: Record<string, string>;
}) {
  return (
    <div className="space-y-2">
      {items.map((row, idx) => (
        <div key={idx} className="rounded-lg border border-gray-200 bg-gray-50 p-2">
          <div className="grid gap-2 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key}>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500">{f.label}</label>
                <input
                  value={row[f.key] || ""}
                  onChange={(e) => onChange(items.map((r, i) => i === idx ? { ...r, [f.key]: e.target.value } : r))}
                  className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
              </div>
            ))}
          </div>
          <button
            onClick={() => onChange(items.filter((_, i) => i !== idx))}
            className="mt-1 text-[11px] font-semibold text-rose-600 hover:underline"
          >
            Remove row
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...items, { ...emptyItem }])}
        className="rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-[#0F6E56] hover:text-[#0F6E56]"
      >
        {addLabel}
      </button>
    </div>
  );
}
