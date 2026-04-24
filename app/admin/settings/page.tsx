"use client";

import { useEffect, useState } from "react";
import type {
  SiteSettings,
  CommonSettings as CommonT,
  CaptchaSettings as CaptchaT,
  PaymentGateway,
  ManualPaymentMethod,
  SmtpSettings as SmtpT,
  PageSettings as PageT,
  CurrencySettings as CurrencyT,
  LanguageEntry,
  TranslationEntry,
  InvoiceSettings as InvoiceT,
  SocialProvider,
} from "@/lib/settings-store";

const SECTIONS = [
  { id: "common", label: "Common Settings", icon: "⚙️", grad: "from-slate-500 to-gray-700" },
  { id: "captcha", label: "Google Captcha Setting", icon: "🛡️", grad: "from-red-500 to-rose-600" },
  { id: "payment", label: "Payment Gateways", icon: "💳", grad: "from-emerald-500 to-green-600" },
  { id: "manual-payment", label: "Manual Payment Gateways", icon: "🏦", grad: "from-teal-500 to-cyan-600" },
  { id: "smtp", label: "SMTP Settings", icon: "✉️", grad: "from-sky-500 to-blue-600" },
  { id: "page", label: "Page Settings", icon: "📄", grad: "from-indigo-500 to-violet-600" },
  { id: "currency", label: "Currency Settings", icon: "💰", grad: "from-amber-500 to-yellow-600" },
  { id: "languages", label: "Languages", icon: "🌐", grad: "from-fuchsia-500 to-pink-600" },
  { id: "translation", label: "Translation", icon: "🔤", grad: "from-purple-500 to-fuchsia-600" },
  { id: "invoice", label: "Invoice Settings", icon: "🧾", grad: "from-orange-500 to-red-600" },
  { id: "social-login", label: "Social Media Login", icon: "🔑", grad: "from-cyan-500 to-sky-600" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const inputCls =
  "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20";

async function patchSection(patch: Partial<SiteSettings>): Promise<void> {
  const r = await fetch("/api/admin/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${r.status}`);
  }
}

export default function AdminSettings() {
  const [active, setActive] = useState<SectionId>("common");
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ text: string; err?: boolean } | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/settings", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setSettings(data.settings);
    } catch (err) {
      showToast((err as Error).message, true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function showToast(text: string, err = false) {
    setToast({ text, err });
    setTimeout(() => setToast(null), 2500);
  }

  async function save(patch: Partial<SiteSettings>) {
    try {
      await patchSection(patch);
      await refresh();
      showToast("\u2713 Settings saved");
    } catch (err) {
      showToast((err as Error).message, true);
    }
  }

  return (
    <div>
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700 via-gray-800 to-zinc-900 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="relative">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
            </span>
            System configuration
          </div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="mt-1 text-sm text-slate-200/90">
            Configure site-wide options, payment, email, currency and more.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="lg:w-64 lg:flex-shrink-0">
          <ul className="overflow-hidden rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-gray-100">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => setActive(s.id)}
                  className={`mb-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all ${
                    active === s.id
                      ? `bg-gradient-to-r ${s.grad} font-semibold text-white shadow-md`
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-base">{s.icon}</span>
                  <span className="truncate">{s.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="min-w-0 flex-1 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className={`h-1 bg-gradient-to-r ${SECTIONS.find((s) => s.id === active)?.grad || "from-slate-500 to-gray-700"}`} />
          <div className="p-6">
          {loading || !settings ? (
            <div className="py-20 text-center text-sm text-gray-500">Loading settings…</div>
          ) : (
            <>
              {active === "common" && <CommonSection value={settings.common} onSave={(v) => save({ common: v })} />}
              {active === "captcha" && <CaptchaSection value={settings.captcha} onSave={(v) => save({ captcha: v })} />}
              {active === "payment" && <PaymentSection value={settings.paymentGateways} onSave={(v) => save({ paymentGateways: v })} />}
              {active === "manual-payment" && <ManualSection value={settings.manualPayments} onSave={(v) => save({ manualPayments: v })} />}
              {active === "smtp" && <SmtpSection value={settings.smtp} onSave={(v) => save({ smtp: v })} showToast={showToast} />}
              {active === "page" && <PageSection value={settings.page} onSave={(v) => save({ page: v })} />}
              {active === "currency" && <CurrencySection value={settings.currency} onSave={(v) => save({ currency: v })} />}
              {active === "languages" && <LanguagesSection value={settings.languages} onSave={(v) => save({ languages: v })} />}
              {active === "translation" && (
                <TranslationSection
                  rows={settings.translations}
                  languages={settings.languages}
                  onSave={(v) => save({ translations: v })}
                />
              )}
              {active === "invoice" && <InvoiceSection value={settings.invoice} onSave={(v) => save({ invoice: v })} />}
              {active === "social-login" && <SocialSection value={settings.socialProviders} onSave={(v) => save({ socialProviders: v })} />}
            </>
          )}

          {toast && (
            <div
              className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-lg ${
                toast.err ? "bg-gradient-to-r from-rose-500 to-red-600" : "bg-gradient-to-r from-emerald-500 to-green-600"
              }`}
            >
              {toast.text}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

// -------- Shared bits --------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6 border-b border-gray-100 pb-4">
      <h2 className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-lg font-bold text-transparent">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}

function SaveButton({ saving }: { saving?: boolean }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
    >
      {saving ? "Saving…" : "✓ Update"}
    </button>
  );
}

// -------- Sections --------

function CommonSection({ value, onSave }: { value: CommonT; onSave: (v: CommonT) => Promise<void> }) {
  const [form, setForm] = useState(value);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(value), [value]);
  return (
    <form onSubmit={async (e) => { e.preventDefault(); setSaving(true); await onSave(form); setSaving(false); }}>
      <SectionHeader title="Common Settings" subtitle="Basic site information and defaults." />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="Site Name"><input className={inputCls} value={form.siteName} onChange={(e) => setForm({ ...form, siteName: e.target.value })} /></Field>
        <Field label="Tagline"><input className={inputCls} value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} /></Field>
        <Field label="Contact Email"><input type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Contact Phone"><input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <div className="md:col-span-2"><Field label="Address"><input className={inputCls} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field></div>
        <Field label="Copyright Text"><input className={inputCls} value={form.copyright} onChange={(e) => setForm({ ...form, copyright: e.target.value })} /></Field>
        <Field label="Timezone">
          <select className={inputCls} value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
            <option value="UTC">UTC</option>
            <option value="America/New_York">America/New_York</option>
            <option value="America/Los_Angeles">America/Los_Angeles</option>
            <option value="Europe/London">Europe/London</option>
            <option value="Asia/Kolkata">Asia/Kolkata</option>
            <option value="Asia/Dubai">Asia/Dubai</option>
          </select>
        </Field>
        <div className="md:col-span-2"><Field label="Footer Text"><textarea rows={2} className={inputCls} value={form.footerText} onChange={(e) => setForm({ ...form, footerText: e.target.value })} /></Field></div>
      </div>
      <div className="mt-6"><SaveButton saving={saving} /></div>
    </form>
  );
}

function CaptchaSection({ value, onSave }: { value: CaptchaT; onSave: (v: CaptchaT) => Promise<void> }) {
  const [form, setForm] = useState(value);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(value), [value]);
  return (
    <form onSubmit={async (e) => { e.preventDefault(); setSaving(true); await onSave(form); setSaving(false); }}>
      <SectionHeader title="Google Captcha Setting" subtitle="Protect forms from spam with Google reCAPTCHA." />
      <label className="mb-5 flex items-center gap-3 text-sm text-gray-700">
        <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
        Enable reCAPTCHA
      </label>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="reCAPTCHA Version">
          <select className={inputCls} value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value as "v2" | "v3" })}>
            <option value="v2">v2 (Checkbox)</option>
            <option value="v3">v3 (Invisible)</option>
          </select>
        </Field>
        <div />
        <Field label="Site Key"><input className={inputCls} value={form.siteKey} onChange={(e) => setForm({ ...form, siteKey: e.target.value })} placeholder="6Lc..." /></Field>
        <Field label="Secret Key"><input type="password" className={inputCls} value={form.secretKey} onChange={(e) => setForm({ ...form, secretKey: e.target.value })} placeholder="••••••••" /></Field>
      </div>
      <p className="mt-4 text-xs text-gray-400">
        Get keys from <a href="https://www.google.com/recaptcha/admin" target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">Google reCAPTCHA Admin</a>
      </p>
      <div className="mt-6"><SaveButton saving={saving} /></div>
    </form>
  );
}

function PaymentSection({ value, onSave }: { value: PaymentGateway[]; onSave: (v: PaymentGateway[]) => Promise<void> }) {
  const [list, setList] = useState(value);
  const [saving, setSaving] = useState(false);
  useEffect(() => setList(value), [value]);
  const patchItem = (id: string, p: Partial<PaymentGateway>) =>
    setList(list.map((g) => (g.id === id ? { ...g, ...p } : g)));
  return (
    <form onSubmit={async (e) => { e.preventDefault(); setSaving(true); await onSave(list); setSaving(false); }}>
      <SectionHeader title="Payment Gateways" subtitle="Configure online payment providers." />
      <div className="space-y-4">
        {list.map((g) => (
          <div key={g.id} className="rounded-lg border border-gray-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{g.name}</h3>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={g.enabled} onChange={(e) => patchItem(g.id, { enabled: e.target.checked })} />
                <span>{g.enabled ? "Enabled" : "Disabled"}</span>
              </label>
            </div>
            {g.enabled && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Mode">
                  <select className={inputCls} value={g.mode} onChange={(e) => patchItem(g.id, { mode: e.target.value as "test" | "live" })}>
                    <option value="test">Test / Sandbox</option>
                    <option value="live">Live</option>
                  </select>
                </Field>
                <div />
                <Field label="Public / Client Key"><input className={inputCls} value={g.publicKey} onChange={(e) => patchItem(g.id, { publicKey: e.target.value })} /></Field>
                <Field label="Secret Key"><input type="password" className={inputCls} value={g.secretKey} onChange={(e) => patchItem(g.id, { secretKey: e.target.value })} /></Field>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-6"><SaveButton saving={saving} /></div>
    </form>
  );
}

function ManualSection({ value, onSave }: { value: ManualPaymentMethod[]; onSave: (v: ManualPaymentMethod[]) => Promise<void> }) {
  const [list, setList] = useState(value);
  const [saving, setSaving] = useState(false);
  useEffect(() => setList(value), [value]);
  const patchItem = (id: string, p: Partial<ManualPaymentMethod>) =>
    setList(list.map((m) => (m.id === id ? { ...m, ...p } : m)));
  const add = () => setList([...list, { id: `m-${Date.now()}`, name: "", instructions: "", enabled: true }]);
  const remove = (id: string) => setList(list.filter((m) => m.id !== id));
  return (
    <form onSubmit={async (e) => { e.preventDefault(); setSaving(true); await onSave(list); setSaving(false); }}>
      <SectionHeader title="Manual Payment Gateways" subtitle="Bank transfer, COD, UPI, etc. — customers get instructions at checkout." />
      <div className="space-y-4">
        {list.map((m, i) => (
          <div key={m.id} className="rounded-lg border border-gray-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Method {i + 1}</h3>
              <button type="button" onClick={() => remove(m.id)} className="text-xs font-medium text-red-600 hover:underline">Remove</button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <Field label="Method Name"><input className={inputCls} value={m.name} onChange={(e) => patchItem(m.id, { name: e.target.value })} placeholder="e.g. Bank Transfer" /></Field>
              <Field label="Payment Instructions (shown to customer)"><textarea rows={4} className={inputCls} value={m.instructions} onChange={(e) => patchItem(m.id, { instructions: e.target.value })} /></Field>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={m.enabled} onChange={(e) => patchItem(m.id, { enabled: e.target.checked })} /> Enabled
              </label>
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={add} className="mt-4 rounded-lg border-2 border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:border-primary-400 hover:text-primary-600">
        + Add Manual Method
      </button>
      <div className="mt-6"><SaveButton saving={saving} /></div>
    </form>
  );
}

function SmtpSection({ value, onSave, showToast }: { value: SmtpT; onSave: (v: SmtpT) => Promise<void>; showToast: (t: string, err?: boolean) => void }) {
  const [form, setForm] = useState(value);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  useEffect(() => setForm(value), [value]);

  async function sendTest() {
    const to = prompt("Send test email to:", form.fromEmail);
    if (!to) return;
    setTesting(true);
    try {
      const r = await fetch("/api/admin/settings/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      if (data.skipped) showToast("Skipped — RESEND_API_KEY not configured");
      else showToast("\u2713 Test email sent");
    } catch (err) {
      showToast((err as Error).message, true);
    } finally {
      setTesting(false);
    }
  }

  return (
    <form onSubmit={async (e) => { e.preventDefault(); setSaving(true); await onSave(form); setSaving(false); }}>
      <SectionHeader title="SMTP Settings" subtitle="Configure outgoing email server." />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="SMTP Host"><input className={inputCls} value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} /></Field>
        <Field label="SMTP Port"><input className={inputCls} value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} /></Field>
        <Field label="Encryption">
          <select className={inputCls} value={form.encryption} onChange={(e) => setForm({ ...form, encryption: e.target.value as "none" | "ssl" | "tls" })}>
            <option value="none">None</option>
            <option value="ssl">SSL</option>
            <option value="tls">TLS</option>
          </select>
        </Field>
        <Field label="SMTP Username"><input className={inputCls} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></Field>
        <Field label="SMTP Password"><input type="password" className={inputCls} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        <div />
        <Field label="From Email"><input type="email" className={inputCls} value={form.fromEmail} onChange={(e) => setForm({ ...form, fromEmail: e.target.value })} /></Field>
        <Field label="From Name"><input className={inputCls} value={form.fromName} onChange={(e) => setForm({ ...form, fromName: e.target.value })} /></Field>
      </div>
      <div className="mt-6 flex gap-3">
        <SaveButton saving={saving} />
        <button type="button" onClick={sendTest} disabled={testing} className="rounded-lg border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          {testing ? "Sending…" : "Send Test Email"}
        </button>
      </div>
      <p className="mt-3 text-xs text-gray-400">Live sends use Resend + the configured OduDoc mailboxes. SMTP fields above are saved for reference.</p>
    </form>
  );
}

function PageSection({ value, onSave }: { value: PageT; onSave: (v: PageT) => Promise<void> }) {
  const [form, setForm] = useState(value);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(value), [value]);
  return (
    <form onSubmit={async (e) => { e.preventDefault(); setSaving(true); await onSave(form); setSaving(false); }}>
      <SectionHeader title="Page Settings" subtitle="Toggle features and control pagination." />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Features</h3>
          <div className="space-y-2">
            {([
              { key: "enableBlog", label: "Enable Blog" },
              { key: "enableShop", label: "Enable Shop / E-commerce" },
              { key: "enableDepartments", label: "Enable Departments" },
              { key: "enableDoctors", label: "Enable Doctors" },
            ] as const).map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} />
                {label}
              </label>
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">UI Elements</h3>
          <div className="space-y-2">
            {([
              { key: "showBreadcrumb", label: "Show Breadcrumb" },
              { key: "showBackToTop", label: "Show Back-to-Top button" },
              { key: "showCookieConsent", label: "Show Cookie Consent banner" },
              { key: "showLiveChat", label: "Show Live Chat widget" },
            ] as const).map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} />
                {label}
              </label>
            ))}
          </div>
        </div>
        <Field label="Blog Posts Per Page"><input type="number" className={inputCls} value={form.postsPerPage} onChange={(e) => setForm({ ...form, postsPerPage: Number(e.target.value) })} /></Field>
        <Field label="Products Per Page"><input type="number" className={inputCls} value={form.productsPerPage} onChange={(e) => setForm({ ...form, productsPerPage: Number(e.target.value) })} /></Field>
      </div>
      <div className="mt-6"><SaveButton saving={saving} /></div>
    </form>
  );
}

function CurrencySection({ value, onSave }: { value: CurrencyT; onSave: (v: CurrencyT) => Promise<void> }) {
  const [form, setForm] = useState(value);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(value), [value]);
  return (
    <form onSubmit={async (e) => { e.preventDefault(); setSaving(true); await onSave(form); setSaving(false); }}>
      <SectionHeader title="Currency Settings" subtitle="Default currency used across bookings, shop and invoices." />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="Currency Name"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Currency Code"><input className={inputCls} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></Field>
        <Field label="Currency Symbol"><input className={inputCls} value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} /></Field>
        <Field label="Currency Position">
          <select className={inputCls} value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value as CurrencyT["position"] })}>
            <option value="left">Left ($100)</option>
            <option value="right">Right (100$)</option>
            <option value="left-space">Left with space ($ 100)</option>
            <option value="right-space">Right with space (100 $)</option>
          </select>
        </Field>
        <Field label="Decimal Separator">
          <select className={inputCls} value={form.decimalSeparator} onChange={(e) => setForm({ ...form, decimalSeparator: e.target.value })}>
            <option value="1,234,567.89">1,234,567.89</option>
            <option value="1.234.567,89">1.234.567,89</option>
            <option value="1 234 567.89">1 234 567.89</option>
            <option value="1,23,456.70">1,23,456.70 (Indian)</option>
          </select>
        </Field>
        <Field label="No of decimals">
          <select className={inputCls} value={String(form.decimals)} onChange={(e) => setForm({ ...form, decimals: Number(e.target.value) })}>
            <option value="0">0 (1234)</option>
            <option value="1">1 (1234.5)</option>
            <option value="2">2 (1234.56)</option>
            <option value="3">3 (1234.567)</option>
          </select>
        </Field>
      </div>
      <div className="mt-6"><SaveButton saving={saving} /></div>
    </form>
  );
}

function LanguagesSection({ value, onSave }: { value: LanguageEntry[]; onSave: (v: LanguageEntry[]) => Promise<void> }) {
  const [list, setList] = useState(value);
  const [saving, setSaving] = useState(false);
  useEffect(() => setList(value), [value]);
  const patchItem = (id: string, p: Partial<LanguageEntry>) =>
    setList(list.map((l) => (l.id === id ? { ...l, ...p } : l)));
  const setDefault = (id: string) => setList(list.map((l) => ({ ...l, default: l.id === id })));
  const remove = (id: string) => setList(list.filter((l) => l.id !== id));
  const add = () =>
    setList([...list, { id: `l-${Date.now()}`, code: "", name: "", native: "", default: false, enabled: true }]);
  return (
    <form onSubmit={async (e) => { e.preventDefault(); setSaving(true); await onSave(list); setSaving(false); }}>
      <SectionHeader title="Languages" subtitle="Add languages available to visitors." />
      <div className="overflow-hidden rounded-lg border border-gray-100">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Code</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Native</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Default</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Enabled</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {list.map((l) => (
              <tr key={l.id}>
                <td className="px-3 py-2">
                  <input className="w-20 rounded border border-gray-200 px-2 py-1 font-mono text-xs" value={l.code} onChange={(e) => patchItem(l.id, { code: e.target.value })} />
                </td>
                <td className="px-3 py-2">
                  <input className="w-full rounded border border-gray-200 px-2 py-1 text-sm" value={l.name} onChange={(e) => patchItem(l.id, { name: e.target.value })} />
                </td>
                <td className="px-3 py-2">
                  <input className="w-full rounded border border-gray-200 px-2 py-1 text-sm" value={l.native} onChange={(e) => patchItem(l.id, { native: e.target.value })} />
                </td>
                <td className="px-4 py-2"><input type="radio" name="default-lang" checked={l.default} onChange={() => setDefault(l.id)} /></td>
                <td className="px-4 py-2"><input type="checkbox" checked={l.enabled} onChange={(e) => patchItem(l.id, { enabled: e.target.checked })} /></td>
                <td className="px-4 py-2 text-right"><button type="button" onClick={() => remove(l.id)} className="text-xs font-medium text-red-600 hover:underline">Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={add} className="mt-4 rounded-lg border-2 border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:border-primary-400 hover:text-primary-600">+ Add Language</button>
      <div className="mt-6"><SaveButton saving={saving} /></div>
    </form>
  );
}

function TranslationSection({
  rows,
  languages,
  onSave,
}: {
  rows: TranslationEntry[];
  languages: LanguageEntry[];
  onSave: (v: TranslationEntry[]) => Promise<void>;
}) {
  const nonEnglish = languages.filter((l) => l.code !== "en" && l.enabled);
  const [lang, setLang] = useState(nonEnglish[0]?.code || "es");
  const [list, setList] = useState(rows);
  const [saving, setSaving] = useState(false);
  useEffect(() => setList(rows), [rows]);
  const patchRow = (key: string, v: string) =>
    setList(list.map((r) => (r.key === key ? { ...r, translations: { ...r.translations, [lang]: v } } : r)));
  const addRow = () => {
    const k = prompt("String key (snake_case, e.g. my_button):")?.trim();
    if (!k) return;
    if (list.some((r) => r.key === k)) { alert("Key already exists."); return; }
    const en = prompt("English text:")?.trim() || "";
    setList([...list, { key: k, en, translations: {} }]);
  };
  const removeRow = (key: string) => setList(list.filter((r) => r.key !== key));

  return (
    <form onSubmit={async (e) => { e.preventDefault(); setSaving(true); await onSave(list); setSaving(false); }}>
      <SectionHeader title="Translation" subtitle="Translate UI strings for each language." />
      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Translate to:</label>
        <select value={lang} onChange={(e) => setLang(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
          {nonEnglish.map((l) => (
            <option key={l.code} value={l.code}>{l.name} ({l.native})</option>
          ))}
        </select>
        <button type="button" onClick={addRow} className="ml-auto rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-primary-400 hover:text-primary-600">+ Add string</button>
      </div>
      <div className="overflow-hidden rounded-lg border border-gray-100">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Key</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">English</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Translation</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {list.map((r) => (
              <tr key={r.key}>
                <td className="px-4 py-2 font-mono text-xs text-gray-500">{r.key}</td>
                <td className="px-4 py-2">{r.en}</td>
                <td className="px-4 py-2">
                  <input className="w-full rounded border border-gray-200 px-2 py-1 text-sm" value={r.translations[lang] || ""} onChange={(e) => patchRow(r.key, e.target.value)} />
                </td>
                <td className="px-4 py-2 text-right"><button type="button" onClick={() => removeRow(r.key)} className="text-xs font-medium text-red-600 hover:underline">Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6"><SaveButton saving={saving} /></div>
    </form>
  );
}

function InvoiceSection({ value, onSave }: { value: InvoiceT; onSave: (v: InvoiceT) => Promise<void> }) {
  const [form, setForm] = useState(value);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(value), [value]);
  return (
    <form onSubmit={async (e) => { e.preventDefault(); setSaving(true); await onSave(form); setSaving(false); }}>
      <SectionHeader title="Invoice Settings" subtitle="Information shown on invoices and receipts." />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="Company Name"><input className={inputCls} value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} /></Field>
        <Field label="Invoice Prefix"><input className={inputCls} value={form.invoicePrefix} onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })} /></Field>
        <div className="md:col-span-2"><Field label="Company Address"><input className={inputCls} value={form.companyAddress} onChange={(e) => setForm({ ...form, companyAddress: e.target.value })} /></Field></div>
        <Field label="Company Phone"><input className={inputCls} value={form.companyPhone} onChange={(e) => setForm({ ...form, companyPhone: e.target.value })} /></Field>
        <Field label="Company Email"><input type="email" className={inputCls} value={form.companyEmail} onChange={(e) => setForm({ ...form, companyEmail: e.target.value })} /></Field>
        <Field label="Tax Name"><input className={inputCls} value={form.taxName} onChange={(e) => setForm({ ...form, taxName: e.target.value })} /></Field>
        <Field label="Tax Rate (%)"><input type="number" step="0.1" className={inputCls} value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })} /></Field>
        <label className="flex items-center gap-2 md:col-span-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.showTax} onChange={(e) => setForm({ ...form, showTax: e.target.checked })} /> Show tax line on invoices
        </label>
        <div className="md:col-span-2"><Field label="Logo URL"><input className={inputCls} value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} placeholder="https://..." /></Field></div>
        <div className="md:col-span-2"><Field label="Invoice Footer Note"><textarea rows={3} className={inputCls} value={form.invoiceFooter} onChange={(e) => setForm({ ...form, invoiceFooter: e.target.value })} /></Field></div>
      </div>
      <div className="mt-6"><SaveButton saving={saving} /></div>
    </form>
  );
}

function SocialSection({ value, onSave }: { value: SocialProvider[]; onSave: (v: SocialProvider[]) => Promise<void> }) {
  const [list, setList] = useState(value);
  const [saving, setSaving] = useState(false);
  useEffect(() => setList(value), [value]);
  const patchItem = (id: string, p: Partial<SocialProvider>) =>
    setList(list.map((x) => (x.id === id ? { ...x, ...p } : x)));
  return (
    <form onSubmit={async (e) => { e.preventDefault(); setSaving(true); await onSave(list); setSaving(false); }}>
      <SectionHeader title="Social Media Login" subtitle="Allow users to sign in using their social accounts." />
      <div className="space-y-4">
        {list.map((p) => (
          <div key={p.id} className="rounded-lg border border-gray-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{p.name}</h3>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={p.enabled} onChange={(e) => patchItem(p.id, { enabled: e.target.checked })} />
                <span>{p.enabled ? "Enabled" : "Disabled"}</span>
              </label>
            </div>
            {p.enabled && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Client ID"><input className={inputCls} value={p.clientId} onChange={(e) => patchItem(p.id, { clientId: e.target.value })} /></Field>
                <Field label="Client Secret"><input type="password" className={inputCls} value={p.clientSecret} onChange={(e) => patchItem(p.id, { clientSecret: e.target.value })} /></Field>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-6"><SaveButton saving={saving} /></div>
    </form>
  );
}
