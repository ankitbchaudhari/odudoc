"use client";

import { useCallback, useEffect, useState } from "react";

// ---------- Types (mirror lib/theme-store.ts) ----------

type HomepageLayout = "default" | "v2" | "v3" | "v4" | "v5";
type HeroStyle = "default" | "stats" | "schedule" | "text-slider" | "minimal";
type FontFamily = "inter" | "poppins" | "roboto" | "manrope" | "system";
type ButtonShape = "rounded" | "pill" | "square";
type HeaderStyle = "default" | "compact" | "transparent" | "centered";
type SidebarStyle = "light" | "dark" | "brand";
type CookieBanner = "off" | "simple" | "full";

interface Theme {
  siteName: string;
  logoText: string;
  tagline: string;
  logoUrl: string;
  logoDarkUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  linkColor: string;
  enableDarkMode: boolean;
  defaultMode: "light" | "dark" | "auto";
  fontFamily: FontFamily;
  headingFontFamily: FontFamily;
  baseFontSize: number;
  borderRadius: number;
  buttonShape: ButtonShape;
  homeLayout: HomepageLayout;
  heroStyle: HeroStyle;
  headerStyle: HeaderStyle;
  sidebarStyle: SidebarStyle;
  stickyHeader: boolean;
  showBreadcrumbs: boolean;
  footerText: string;
  footerColumns: number;
  announcement: {
    enabled: boolean;
    text: string;
    linkLabel: string;
    linkHref: string;
    background: string;
    textColor: string;
  };
  features: {
    blog: boolean;
    shop: boolean;
    reviews: boolean;
    comments: boolean;
    appointments: boolean;
    careers: boolean;
    chatWidget: boolean;
  };
  social: {
    facebook: string;
    twitter: string;
    instagram: string;
    linkedin: string;
    youtube: string;
    tiktok: string;
  };
  seo: {
    metaTitle: string;
    metaDescription: string;
    ogImage: string;
    keywords: string;
    googleAnalyticsId: string;
    googleTagManagerId: string;
    facebookPixelId: string;
    metaVerification: string;
    robotsIndex: boolean;
  };
  customCss: string;
  customHeadHtml: string;
  customFooterHtml: string;
  cookieBanner: CookieBanner;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  updatedAt: string;
}

// ---------- Tabs ----------

const TABS = [
  { id: "brand", label: "Brand", icon: "🎨", grad: "from-pink-500 to-rose-600" },
  { id: "colors", label: "Colors", icon: "🌈", grad: "from-fuchsia-500 to-purple-600" },
  { id: "typography", label: "Typography", icon: "🔤", grad: "from-violet-500 to-indigo-600" },
  { id: "layout", label: "Layout", icon: "📐", grad: "from-sky-500 to-blue-600" },
  { id: "announcement", label: "Announcement Bar", icon: "📣", grad: "from-amber-500 to-orange-600" },
  { id: "features", label: "Features", icon: "✨", grad: "from-emerald-500 to-teal-600" },
  { id: "social", label: "Social Links", icon: "🔗", grad: "from-cyan-500 to-blue-600" },
  { id: "seo", label: "SEO & Analytics", icon: "📊", grad: "from-lime-500 to-green-600" },
  { id: "advanced", label: "Advanced", icon: "⚙️", grad: "from-slate-500 to-gray-700" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ---------- Page ----------

export default function AdminCustomize() {
  const [theme, setTheme] = useState<Theme | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("brand");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/theme");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setTheme(data.theme);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!theme) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(theme),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTheme(data.theme);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!confirm("Reset all theme settings to defaults?")) return;
    const res = await fetch("/api/admin/theme", { method: "DELETE" });
    const data = await res.json();
    if (res.ok) setTheme(data.theme);
  };

  if (loading || !theme) {
    return <div className="py-12 text-center text-sm text-gray-500">{error ? `Error: ${error}` : "Loading theme…"}</div>;
  }

  const set = <K extends keyof Theme>(key: K, val: Theme[K]) => setTheme({ ...theme, [key]: val });

  return (
    <div>
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-700 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-pink-300/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink-300 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-pink-400" />
              </span>
              Theme studio
            </div>
            <h1 className="text-2xl font-bold">Customize Theme</h1>
            <p className="mt-1 text-sm text-purple-50/90">
              Brand, colors, typography, layout, SEO and integrations — all in one place.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={reset} className="rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25">Reset</button>
            <button onClick={save} disabled={saving} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-purple-700 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60">
              {saving ? "Saving…" : saved ? "✓ Saved" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="flex gap-1 p-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                tab === t.id
                  ? `bg-gradient-to-r ${t.grad} text-white shadow-md`
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="h-1 bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500" />
        <div className="p-6">
        {tab === "brand" && <BrandTab theme={theme} set={set} />}
        {tab === "colors" && <ColorsTab theme={theme} set={set} />}
        {tab === "typography" && <TypographyTab theme={theme} set={set} />}
        {tab === "layout" && <LayoutTab theme={theme} set={set} />}
        {tab === "announcement" && <AnnouncementTab theme={theme} setTheme={setTheme} />}
        {tab === "features" && <FeaturesTab theme={theme} setTheme={setTheme} />}
        {tab === "social" && <SocialTab theme={theme} setTheme={setTheme} />}
        {tab === "seo" && <SeoTab theme={theme} setTheme={setTheme} />}
        {tab === "advanced" && <AdvancedTab theme={theme} set={set} />}
        </div>
      </div>

      {/* Live preview */}
      <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
        <div className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow">
            👁
          </span>
          <h2 className="text-base font-bold text-gray-900">Live Preview</h2>
        </div>
        {theme.announcement.enabled && (
          <div className="mb-2 rounded-lg px-4 py-2 text-center text-xs font-medium" style={{ background: theme.announcement.background, color: theme.announcement.textColor }}>
            {theme.announcement.text}
            {theme.announcement.linkLabel && (
              <a href={theme.announcement.linkHref} className="ml-2 underline">{theme.announcement.linkLabel}</a>
            )}
          </div>
        )}
        <div
          className="p-8 text-center text-white shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`,
            borderRadius: theme.borderRadius,
          }}
        >
          <h3 className="text-3xl font-bold">{theme.siteName}</h3>
          <p className="mt-2 opacity-90">{theme.tagline}</p>
          <button
            className="mt-6 px-6 py-2 text-sm font-semibold"
            style={{
              background: theme.accentColor,
              color: "#111",
              borderRadius: theme.buttonShape === "pill" ? 999 : theme.buttonShape === "square" ? 0 : theme.borderRadius,
            }}
          >
            Primary Button
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Small field helpers ----------

function TextField({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-gray-700">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" />
    </label>
  );
}

function Textarea({ label, value, onChange, rows = 4, placeholder, mono }: { label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string; mono?: boolean }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-gray-700">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} className={`w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 ${mono ? "font-mono text-xs" : ""}`} />
    </label>
  );
}

function Select<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string }> }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-gray-700">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20">
        {options.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
    </label>
  );
}

function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (b: boolean) => void; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2">
      <span>
        <span className="block text-sm font-medium text-gray-700">{label}</span>
        {hint && <span className="block text-xs text-gray-400">{hint}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary-600" />
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-14 cursor-pointer rounded border border-gray-200" />
        <input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" />
      </div>
    </div>
  );
}

// ---------- Tabs ----------

function BrandTab({ theme, set }: { theme: Theme; set: <K extends keyof Theme>(k: K, v: Theme[K]) => void }) {
  const uploadImage = async (file: File, key: "logoUrl" | "logoDarkUrl" | "faviconUrl") => {
    const reader = new FileReader();
    reader.onload = () => set(key, reader.result as string);
    reader.readAsDataURL(file);
  };
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <TextField label="Site Name" value={theme.siteName} onChange={(v) => set("siteName", v)} />
      <TextField label="Logo Text" value={theme.logoText} onChange={(v) => set("logoText", v)} />
      <TextField label="Tagline" value={theme.tagline} onChange={(v) => set("tagline", v)} />
      <div />
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">Logo (light)</label>
        {theme.logoUrl && <img src={theme.logoUrl} alt="" className="mb-2 h-10 w-auto rounded border border-gray-200 bg-white p-1" />}
        <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "logoUrl")} className="w-full text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-700" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">Logo (dark mode)</label>
        {theme.logoDarkUrl && <img src={theme.logoDarkUrl} alt="" className="mb-2 h-10 w-auto rounded border border-gray-200 bg-gray-900 p-1" />}
        <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "logoDarkUrl")} className="w-full text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-700" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">Favicon (32×32 recommended)</label>
        {theme.faviconUrl && <img src={theme.faviconUrl} alt="" className="mb-2 h-8 w-8 rounded border border-gray-200 bg-white p-1" />}
        <input type="file" accept="image/png,image/x-icon,image/svg+xml" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "faviconUrl")} className="w-full text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-700" />
      </div>
    </div>
  );
}

function ColorsTab({ theme, set }: { theme: Theme; set: <K extends keyof Theme>(k: K, v: Theme[K]) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <ColorField label="Primary" value={theme.primaryColor} onChange={(v) => set("primaryColor", v)} />
      <ColorField label="Secondary" value={theme.secondaryColor} onChange={(v) => set("secondaryColor", v)} />
      <ColorField label="Accent" value={theme.accentColor} onChange={(v) => set("accentColor", v)} />
      <ColorField label="Background" value={theme.backgroundColor} onChange={(v) => set("backgroundColor", v)} />
      <ColorField label="Body Text" value={theme.textColor} onChange={(v) => set("textColor", v)} />
      <ColorField label="Links" value={theme.linkColor} onChange={(v) => set("linkColor", v)} />
      <div className="md:col-span-2 lg:col-span-3 grid gap-2 sm:grid-cols-2">
        <Toggle label="Enable dark mode toggle" checked={theme.enableDarkMode} onChange={(v) => set("enableDarkMode", v)} hint="Shows a sun/moon switch in the header." />
        <Select label="Default mode" value={theme.defaultMode} onChange={(v) => set("defaultMode", v as Theme["defaultMode"])} options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }, { value: "auto", label: "Match system" }]} />
      </div>
    </div>
  );
}

function TypographyTab({ theme, set }: { theme: Theme; set: <K extends keyof Theme>(k: K, v: Theme[K]) => void }) {
  const fonts = [
    { value: "inter" as const, label: "Inter (default)" },
    { value: "poppins" as const, label: "Poppins" },
    { value: "roboto" as const, label: "Roboto" },
    { value: "manrope" as const, label: "Manrope" },
    { value: "system" as const, label: "System UI" },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Select label="Body Font" value={theme.fontFamily} onChange={(v) => set("fontFamily", v)} options={fonts} />
      <Select label="Headings Font" value={theme.headingFontFamily} onChange={(v) => set("headingFontFamily", v)} options={fonts} />
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-gray-700">Base Font Size ({theme.baseFontSize}px)</span>
        <input type="range" min={12} max={20} value={theme.baseFontSize} onChange={(e) => set("baseFontSize", Number(e.target.value))} className="w-full" />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-gray-700">Border Radius ({theme.borderRadius}px)</span>
        <input type="range" min={0} max={24} value={theme.borderRadius} onChange={(e) => set("borderRadius", Number(e.target.value))} className="w-full" />
      </label>
      <Select label="Button Shape" value={theme.buttonShape} onChange={(v) => set("buttonShape", v)} options={[{ value: "rounded", label: "Rounded" }, { value: "pill", label: "Pill" }, { value: "square", label: "Square" }]} />
    </div>
  );
}

function LayoutTab({ theme, set }: { theme: Theme; set: <K extends keyof Theme>(k: K, v: Theme[K]) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Select label="Homepage Layout" value={theme.homeLayout} onChange={(v) => set("homeLayout", v)} options={[
        { value: "default", label: "Default" },
        { value: "v2", label: "Home V2 (Stats Hero)" },
        { value: "v3", label: "Home V3 (Schedule Hero)" },
        { value: "v4", label: "Home V4 (Text Slider)" },
        { value: "v5", label: "Home V5 (Minimal)" },
      ]} />
      <Select label="Hero Style" value={theme.heroStyle} onChange={(v) => set("heroStyle", v)} options={[
        { value: "default", label: "Default" },
        { value: "stats", label: "With Stats" },
        { value: "schedule", label: "With Schedule" },
        { value: "text-slider", label: "Text Slider" },
        { value: "minimal", label: "Minimal" },
      ]} />
      <Select label="Header Style" value={theme.headerStyle} onChange={(v) => set("headerStyle", v)} options={[
        { value: "default", label: "Default" },
        { value: "compact", label: "Compact" },
        { value: "transparent", label: "Transparent" },
        { value: "centered", label: "Centered" },
      ]} />
      <Select label="Sidebar Style (admin)" value={theme.sidebarStyle} onChange={(v) => set("sidebarStyle", v)} options={[
        { value: "light", label: "Light" },
        { value: "dark", label: "Dark" },
        { value: "brand", label: "Brand" },
      ]} />
      <Toggle label="Sticky header" checked={theme.stickyHeader} onChange={(v) => set("stickyHeader", v)} />
      <Toggle label="Show breadcrumbs" checked={theme.showBreadcrumbs} onChange={(v) => set("showBreadcrumbs", v)} />
      <TextField label="Footer Text" value={theme.footerText} onChange={(v) => set("footerText", v)} />
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-gray-700">Footer Columns ({theme.footerColumns})</span>
        <input type="range" min={1} max={6} value={theme.footerColumns} onChange={(e) => set("footerColumns", Number(e.target.value))} className="w-full" />
      </label>
    </div>
  );
}

function AnnouncementTab({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  const a = theme.announcement;
  const upd = (patch: Partial<Theme["announcement"]>) => setTheme({ ...theme, announcement: { ...a, ...patch } });
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <Toggle label="Enable announcement bar" checked={a.enabled} onChange={(v) => upd({ enabled: v })} hint="Shows a banner above the site header." />
      </div>
      <TextField label="Text" value={a.text} onChange={(v) => upd({ text: v })} />
      <TextField label="Link Label" value={a.linkLabel} onChange={(v) => upd({ linkLabel: v })} />
      <TextField label="Link URL" value={a.linkHref} onChange={(v) => upd({ linkHref: v })} placeholder="/shop" />
      <div />
      <ColorField label="Background" value={a.background} onChange={(v) => upd({ background: v })} />
      <ColorField label="Text Color" value={a.textColor} onChange={(v) => upd({ textColor: v })} />
    </div>
  );
}

function FeaturesTab({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  const f = theme.features;
  const upd = (patch: Partial<Theme["features"]>) => setTheme({ ...theme, features: { ...f, ...patch } });
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Toggle label="Blog" checked={f.blog} onChange={(v) => upd({ blog: v })} hint="Show the /blog section." />
      <Toggle label="Shop" checked={f.shop} onChange={(v) => upd({ shop: v })} hint="E-commerce storefront." />
      <Toggle label="Reviews" checked={f.reviews} onChange={(v) => upd({ reviews: v })} hint="Product & doctor reviews." />
      <Toggle label="Comments" checked={f.comments} onChange={(v) => upd({ comments: v })} hint="Blog post comments." />
      <Toggle label="Appointments" checked={f.appointments} onChange={(v) => upd({ appointments: v })} hint="Doctor booking flow." />
      <Toggle label="Careers" checked={f.careers} onChange={(v) => upd({ careers: v })} hint="/careers page + applications." />
      <Toggle label="Chat Widget" checked={f.chatWidget} onChange={(v) => upd({ chatWidget: v })} hint="Floating support bubble." />
    </div>
  );
}

function SocialTab({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  const s = theme.social;
  const upd = (patch: Partial<Theme["social"]>) => setTheme({ ...theme, social: { ...s, ...patch } });
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <TextField label="Facebook" value={s.facebook} onChange={(v) => upd({ facebook: v })} placeholder="https://facebook.com/…" />
      <TextField label="Twitter / X" value={s.twitter} onChange={(v) => upd({ twitter: v })} placeholder="https://twitter.com/…" />
      <TextField label="Instagram" value={s.instagram} onChange={(v) => upd({ instagram: v })} placeholder="https://instagram.com/…" />
      <TextField label="LinkedIn" value={s.linkedin} onChange={(v) => upd({ linkedin: v })} placeholder="https://linkedin.com/company/…" />
      <TextField label="YouTube" value={s.youtube} onChange={(v) => upd({ youtube: v })} placeholder="https://youtube.com/@…" />
      <TextField label="TikTok" value={s.tiktok} onChange={(v) => upd({ tiktok: v })} placeholder="https://tiktok.com/@…" />
    </div>
  );
}

function SeoTab({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  const s = theme.seo;
  const upd = (patch: Partial<Theme["seo"]>) => setTheme({ ...theme, seo: { ...s, ...patch } });
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <TextField label="Meta Title" value={s.metaTitle} onChange={(v) => upd({ metaTitle: v })} />
      <TextField label="Keywords" value={s.keywords} onChange={(v) => upd({ keywords: v })} placeholder="comma,separated,keywords" />
      <div className="md:col-span-2">
        <Textarea label="Meta Description" value={s.metaDescription} onChange={(v) => upd({ metaDescription: v })} rows={2} />
      </div>
      <TextField label="Open Graph Image URL" value={s.ogImage} onChange={(v) => upd({ ogImage: v })} placeholder="https://…/og.png" />
      <TextField label="Meta Site Verification" value={s.metaVerification} onChange={(v) => upd({ metaVerification: v })} />
      <TextField label="Google Analytics ID" value={s.googleAnalyticsId} onChange={(v) => upd({ googleAnalyticsId: v })} placeholder="G-XXXXXX" />
      <TextField label="Google Tag Manager ID" value={s.googleTagManagerId} onChange={(v) => upd({ googleTagManagerId: v })} placeholder="GTM-XXXX" />
      <TextField label="Facebook Pixel ID" value={s.facebookPixelId} onChange={(v) => upd({ facebookPixelId: v })} />
      <div className="md:col-span-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
        <strong>⚠ Marketing tracker compliance:</strong> These IDs are
        currently <em>not</em> auto-injected into the site. OduDoc is a
        healthcare platform — running Meta Pixel, Google Tag Manager,
        or Analytics on patient-facing routes (dashboards, booking,
        doctor profiles, pharmacy, labs) risks transmitting inferred
        health data to ad networks under DPDP/GDPR/HIPAA. If you wire
        any tracker, gate it via <code>lib/marketing-routes.ts</code>
        and <code>components/MetaPixel.tsx</code> (fail-closed
        allowlist). Confirm Meta's "Automatic event enrichment" is
        OFF in Events Manager before going live.
      </div>
      <div className="md:col-span-2">
        <Toggle label="Allow search engines to index this site" checked={s.robotsIndex} onChange={(v) => upd({ robotsIndex: v })} hint="Off = robots.txt will disallow indexing." />
      </div>
    </div>
  );
}

function AdvancedTab({ theme, set }: { theme: Theme; set: <K extends keyof Theme>(k: K, v: Theme[K]) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Select label="Cookie Banner" value={theme.cookieBanner} onChange={(v) => set("cookieBanner", v)} options={[
          { value: "off", label: "Off" },
          { value: "simple", label: "Simple (accept)" },
          { value: "full", label: "Full (accept / reject / preferences)" },
        ]} />
        <Toggle label="Maintenance mode" checked={theme.maintenanceMode} onChange={(v) => set("maintenanceMode", v)} hint="Shows the maintenance page to all visitors." />
      </div>
      <TextField label="Maintenance Message" value={theme.maintenanceMessage} onChange={(v) => set("maintenanceMessage", v)} />
      <Textarea label="Custom CSS" value={theme.customCss} onChange={(v) => set("customCss", v)} rows={5} mono placeholder={".btn-primary { text-transform: uppercase; }"} />
      <Textarea label="Custom <head> HTML" value={theme.customHeadHtml} onChange={(v) => set("customHeadHtml", v)} rows={4} mono placeholder={"<!-- pixels, verification tags, fonts -->"} />
      <Textarea label="Custom Footer HTML" value={theme.customFooterHtml} onChange={(v) => set("customFooterHtml", v)} rows={4} mono placeholder={"<!-- live chat snippet etc -->"} />
    </div>
  );
}
