"use client";

import { useState } from "react";

const SECTIONS = [
  { id: "common", label: "Common Settings" },
  { id: "captcha", label: "Google Captcha Setting" },
  { id: "payment", label: "Payment Gateways" },
  { id: "manual-payment", label: "Manual Payment Gateways" },
  { id: "smtp", label: "SMTP Settings" },
  { id: "page", label: "Page Settings" },
  { id: "currency", label: "Currency Settings" },
  { id: "languages", label: "Languages" },
  { id: "translation", label: "Translation" },
  { id: "invoice", label: "Invoice Settings" },
  { id: "social-login", label: "Social Media Login" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export default function AdminSettings() {
  const [active, setActive] = useState<SectionId>("common");
  const [saved, setSaved] = useState(false);

  const handleSave = (e?: React.FormEvent) => {
    e?.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure site-wide options, payment, email, currency and more.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left nav */}
        <aside className="lg:w-64 lg:flex-shrink-0">
          <ul className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => setActive(s.id)}
                  className={`flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left text-sm transition-colors ${
                    active === s.id
                      ? "border-primary-600 bg-primary-50 font-semibold text-primary-700"
                      : "border-transparent text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      active === s.id ? "bg-primary-600" : "bg-gray-300"
                    }`}
                  />
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Content */}
        <div className="min-w-0 flex-1 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          {active === "common" && <CommonSettings onSave={handleSave} />}
          {active === "captcha" && <CaptchaSettings onSave={handleSave} />}
          {active === "payment" && <PaymentGatewaySettings onSave={handleSave} />}
          {active === "manual-payment" && <ManualPaymentSettings onSave={handleSave} />}
          {active === "smtp" && <SmtpSettings onSave={handleSave} />}
          {active === "page" && <PageSettings onSave={handleSave} />}
          {active === "currency" && <CurrencySettings onSave={handleSave} />}
          {active === "languages" && <LanguagesSettings onSave={handleSave} />}
          {active === "translation" && <TranslationSettings onSave={handleSave} />}
          {active === "invoice" && <InvoiceSettings onSave={handleSave} />}
          {active === "social-login" && <SocialLoginSettings onSave={handleSave} />}

          {saved && (
            <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-lg">
              ✓ Settings saved
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Reusable bits ----------
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20";

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6 border-b border-gray-100 pb-4">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}

function SaveButton() {
  return (
    <button
      type="submit"
      className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white shadow transition-colors hover:bg-green-700"
    >
      Update
    </button>
  );
}

// ---------- Sections ----------
function CommonSettings({ onSave }: { onSave: () => void }) {
  const [form, setForm] = useState({
    siteName: "OduDoc",
    tagline: "Your Trusted Healthcare Platform",
    email: "contact@odudoc.com",
    phone: "+1 (555) 000-1234",
    address: "123 Medical Center Dr, New York, NY 10001",
    copyright: "© 2026 OduDoc. All rights reserved.",
    footerText: "Dedicated to healthcare excellence.",
    timezone: "America/New_York",
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(); }}>
      <SectionHeader title="Common Settings" subtitle="Basic site information and defaults." />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="Site Name">
          <input className={inputCls} value={form.siteName} onChange={(e) => setForm({ ...form, siteName: e.target.value })} />
        </Field>
        <Field label="Tagline">
          <input className={inputCls} value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
        </Field>
        <Field label="Contact Email">
          <input type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Contact Phone">
          <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Address">
            <input className={inputCls} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
        </div>
        <Field label="Copyright Text">
          <input className={inputCls} value={form.copyright} onChange={(e) => setForm({ ...form, copyright: e.target.value })} />
        </Field>
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
        <div className="md:col-span-2">
          <Field label="Footer Text">
            <textarea rows={2} className={inputCls} value={form.footerText} onChange={(e) => setForm({ ...form, footerText: e.target.value })} />
          </Field>
        </div>
      </div>
      <div className="mt-6"><SaveButton /></div>
    </form>
  );
}

function CaptchaSettings({ onSave }: { onSave: () => void }) {
  const [form, setForm] = useState({
    enabled: false,
    siteKey: "",
    secretKey: "",
    version: "v3",
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(); }}>
      <SectionHeader title="Google Captcha Setting" subtitle="Protect forms from spam with Google reCAPTCHA." />
      <label className="mb-5 flex items-center gap-3 text-sm text-gray-700">
        <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
        Enable reCAPTCHA
      </label>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="reCAPTCHA Version">
          <select className={inputCls} value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })}>
            <option value="v2">v2 (Checkbox)</option>
            <option value="v3">v3 (Invisible)</option>
          </select>
        </Field>
        <div />
        <Field label="Site Key">
          <input className={inputCls} value={form.siteKey} onChange={(e) => setForm({ ...form, siteKey: e.target.value })} placeholder="6Lc..." />
        </Field>
        <Field label="Secret Key">
          <input type="password" className={inputCls} value={form.secretKey} onChange={(e) => setForm({ ...form, secretKey: e.target.value })} placeholder="••••••••" />
        </Field>
      </div>
      <p className="mt-4 text-xs text-gray-400">
        Get keys from <a href="https://www.google.com/recaptcha/admin" target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">Google reCAPTCHA Admin</a>
      </p>
      <div className="mt-6"><SaveButton /></div>
    </form>
  );
}

function PaymentGatewaySettings({ onSave }: { onSave: () => void }) {
  const [gateways, setGateways] = useState([
    { id: "stripe", name: "Stripe", enabled: true, mode: "live", publishableKey: "pk_live_...", secretKey: "sk_live_..." },
    { id: "paypal", name: "PayPal", enabled: false, mode: "sandbox", clientId: "", clientSecret: "" },
    { id: "razorpay", name: "Razorpay", enabled: false, mode: "test", keyId: "", keySecret: "" },
  ]);

  const toggle = (id: string) => {
    setGateways(gateways.map((g) => (g.id === id ? { ...g, enabled: !g.enabled } : g)));
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(); }}>
      <SectionHeader title="Payment Gateways" subtitle="Configure online payment providers." />
      <div className="space-y-4">
        {gateways.map((g) => (
          <div key={g.id} className="rounded-lg border border-gray-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{g.name}</h3>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={g.enabled} onChange={() => toggle(g.id)} />
                <span>{g.enabled ? "Enabled" : "Disabled"}</span>
              </label>
            </div>
            {g.enabled && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Mode">
                  <select className={inputCls} defaultValue={g.mode}>
                    <option value="test">Test / Sandbox</option>
                    <option value="live">Live</option>
                  </select>
                </Field>
                <div />
                <Field label="Public / Client Key">
                  <input className={inputCls} defaultValue={(g as { publishableKey?: string; clientId?: string; keyId?: string }).publishableKey || (g as { publishableKey?: string; clientId?: string; keyId?: string }).clientId || (g as { publishableKey?: string; clientId?: string; keyId?: string }).keyId || ""} />
                </Field>
                <Field label="Secret Key">
                  <input type="password" className={inputCls} defaultValue={(g as { secretKey?: string; clientSecret?: string; keySecret?: string }).secretKey || (g as { secretKey?: string; clientSecret?: string; keySecret?: string }).clientSecret || (g as { secretKey?: string; clientSecret?: string; keySecret?: string }).keySecret || ""} />
                </Field>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-6"><SaveButton /></div>
    </form>
  );
}

function ManualPaymentSettings({ onSave }: { onSave: () => void }) {
  const [methods, setMethods] = useState([
    {
      id: "1",
      name: "Bank Transfer",
      instructions: "Bank: OduDoc Bank\nAccount: 1234567890\nIFSC: ODUD0001234",
      enabled: true,
    },
    {
      id: "2",
      name: "Cash on Delivery",
      instructions: "Pay in cash when your order arrives.",
      enabled: true,
    },
  ]);

  const add = () => {
    setMethods([...methods, { id: `${Date.now()}`, name: "", instructions: "", enabled: true }]);
  };
  const remove = (id: string) => setMethods(methods.filter((m) => m.id !== id));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(); }}>
      <SectionHeader title="Manual Payment Gateways" subtitle="Bank transfer, COD, UPI, etc. — customers get instructions shown at checkout." />
      <div className="space-y-4">
        {methods.map((m, i) => (
          <div key={m.id} className="rounded-lg border border-gray-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Method {i + 1}</h3>
              <button type="button" onClick={() => remove(m.id)} className="text-xs font-medium text-red-600 hover:underline">Remove</button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <Field label="Method Name">
                <input className={inputCls} defaultValue={m.name} placeholder="e.g. Bank Transfer" />
              </Field>
              <Field label="Payment Instructions (shown to customer)">
                <textarea rows={4} className={inputCls} defaultValue={m.instructions} />
              </Field>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" defaultChecked={m.enabled} /> Enabled
              </label>
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={add} className="mt-4 rounded-lg border-2 border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:border-primary-400 hover:text-primary-600">
        + Add Manual Method
      </button>
      <div className="mt-6"><SaveButton /></div>
    </form>
  );
}

function SmtpSettings({ onSave }: { onSave: () => void }) {
  const [form, setForm] = useState({
    host: "smtp.gmail.com",
    port: "587",
    encryption: "tls",
    username: "noreply@odudoc.com",
    password: "",
    fromEmail: "noreply@odudoc.com",
    fromName: "OduDoc",
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(); }}>
      <SectionHeader title="SMTP Settings" subtitle="Configure outgoing email server." />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="SMTP Host"><input className={inputCls} value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} /></Field>
        <Field label="SMTP Port"><input className={inputCls} value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} /></Field>
        <Field label="Encryption">
          <select className={inputCls} value={form.encryption} onChange={(e) => setForm({ ...form, encryption: e.target.value })}>
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
        <SaveButton />
        <button type="button" className="rounded-lg border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Send Test Email
        </button>
      </div>
    </form>
  );
}

function PageSettings({ onSave }: { onSave: () => void }) {
  const [form, setForm] = useState({
    showBreadcrumb: true,
    showBackToTop: true,
    showCookieConsent: true,
    showLiveChat: false,
    enableBlog: true,
    enableShop: true,
    enableDepartments: true,
    enableDoctors: true,
    postsPerPage: 9,
    productsPerPage: 12,
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(); }}>
      <SectionHeader title="Page Settings" subtitle="Toggle features and control pagination." />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Features</h3>
          <div className="space-y-2">
            {(
              [
                { key: "enableBlog", label: "Enable Blog" },
                { key: "enableShop", label: "Enable Shop / E-commerce" },
                { key: "enableDepartments", label: "Enable Departments" },
                { key: "enableDoctors", label: "Enable Doctors" },
              ] as const
            ).map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">UI Elements</h3>
          <div className="space-y-2">
            {(
              [
                { key: "showBreadcrumb", label: "Show Breadcrumb" },
                { key: "showBackToTop", label: "Show Back-to-Top button" },
                { key: "showCookieConsent", label: "Show Cookie Consent banner" },
                { key: "showLiveChat", label: "Show Live Chat widget" },
              ] as const
            ).map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
        <Field label="Blog Posts Per Page">
          <input type="number" className={inputCls} value={form.postsPerPage} onChange={(e) => setForm({ ...form, postsPerPage: Number(e.target.value) })} />
        </Field>
        <Field label="Products Per Page">
          <input type="number" className={inputCls} value={form.productsPerPage} onChange={(e) => setForm({ ...form, productsPerPage: Number(e.target.value) })} />
        </Field>
      </div>
      <div className="mt-6"><SaveButton /></div>
    </form>
  );
}

function CurrencySettings({ onSave }: { onSave: () => void }) {
  const [form, setForm] = useState({
    name: "Dollar",
    code: "USD",
    symbol: "$",
    position: "left",
    decimalSeparator: "1,234,567.89",
    decimals: "2",
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(); }}>
      <SectionHeader title="Currency Settings" subtitle="Default currency used across bookings, shop and invoices." />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="Currency Name">
          <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Currency Name" />
        </Field>
        <Field label="Currency Code">
          <input className={inputCls} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="USD" />
        </Field>
        <Field label="Currency Symbol">
          <input className={inputCls} value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} placeholder="$" />
        </Field>
        <Field label="Currency Position">
          <select className={inputCls} value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })}>
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
          <select className={inputCls} value={form.decimals} onChange={(e) => setForm({ ...form, decimals: e.target.value })}>
            <option value="0">0 (1234)</option>
            <option value="1">1 (1234.5)</option>
            <option value="2">2 (1234.56)</option>
            <option value="3">3 (1234.567)</option>
          </select>
        </Field>
      </div>
      <div className="mt-6"><SaveButton /></div>
    </form>
  );
}

function LanguagesSettings({ onSave }: { onSave: () => void }) {
  const [languages, setLanguages] = useState([
    { id: "en", code: "en", name: "English", native: "English", default: true, enabled: true },
    { id: "es", code: "es", name: "Spanish", native: "Español", default: false, enabled: true },
    { id: "fr", code: "fr", name: "French", native: "Français", default: false, enabled: true },
    { id: "ar", code: "ar", name: "Arabic", native: "العربية", default: false, enabled: true },
    { id: "hi", code: "hi", name: "Hindi", native: "हिन्दी", default: false, enabled: false },
  ]);

  const setDefault = (id: string) => {
    setLanguages(languages.map((l) => ({ ...l, default: l.id === id })));
  };
  const toggle = (id: string) => {
    setLanguages(languages.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l)));
  };
  const remove = (id: string) => setLanguages(languages.filter((l) => l.id !== id));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(); }}>
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
            {languages.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-3 font-mono text-xs">{l.code}</td>
                <td className="px-4 py-3">{l.name}</td>
                <td className="px-4 py-3">{l.native}</td>
                <td className="px-4 py-3">
                  <input
                    type="radio"
                    name="default-lang"
                    checked={l.default}
                    onChange={() => setDefault(l.id)}
                  />
                </td>
                <td className="px-4 py-3">
                  <input type="checkbox" checked={l.enabled} onChange={() => toggle(l.id)} />
                </td>
                <td className="px-4 py-3 text-right">
                  <button type="button" onClick={() => remove(l.id)} className="text-xs font-medium text-red-600 hover:underline">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={() => setLanguages([...languages, { id: `${Date.now()}`, code: "", name: "", native: "", default: false, enabled: true }])}
        className="mt-4 rounded-lg border-2 border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:border-primary-400 hover:text-primary-600"
      >
        + Add Language
      </button>
      <div className="mt-6"><SaveButton /></div>
    </form>
  );
}

function TranslationSettings({ onSave }: { onSave: () => void }) {
  const [lang, setLang] = useState("es");
  const [rows, setRows] = useState([
    { key: "book_appointment", en: "Book Appointment", translation: "Reservar Cita" },
    { key: "video_consult", en: "Video Consult", translation: "Consulta por Video" },
    { key: "find_doctors", en: "Find Doctors", translation: "Encontrar Doctores" },
    { key: "sign_in", en: "Sign in", translation: "Iniciar Sesión" },
    { key: "create_account", en: "Create an account", translation: "Crear una cuenta" },
  ]);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(); }}>
      <SectionHeader title="Translation" subtitle="Translate UI strings for each language." />
      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Translate to:</label>
        <select value={lang} onChange={(e) => setLang(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
          <option value="es">Spanish (Español)</option>
          <option value="fr">French (Français)</option>
          <option value="ar">Arabic (العربية)</option>
          <option value="hi">Hindi (हिन्दी)</option>
        </select>
      </div>
      <div className="overflow-hidden rounded-lg border border-gray-100">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Key</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">English</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Translation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r, i) => (
              <tr key={r.key}>
                <td className="px-4 py-2 font-mono text-xs text-gray-500">{r.key}</td>
                <td className="px-4 py-2">{r.en}</td>
                <td className="px-4 py-2">
                  <input
                    className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                    value={r.translation}
                    onChange={(e) => {
                      const next = [...rows];
                      next[i] = { ...r, translation: e.target.value };
                      setRows(next);
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6"><SaveButton /></div>
    </form>
  );
}

function InvoiceSettings({ onSave }: { onSave: () => void }) {
  const [form, setForm] = useState({
    companyName: "OduDoc Inc.",
    companyAddress: "123 Medical Center Dr, New York, NY 10001",
    companyPhone: "+1 (555) 000-1234",
    companyEmail: "billing@odudoc.com",
    taxRate: 8.5,
    taxName: "Sales Tax",
    showTax: true,
    invoicePrefix: "ODU-",
    invoiceFooter: "Thank you for choosing OduDoc. Payment due within 30 days.",
    logoUrl: "",
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(); }}>
      <SectionHeader title="Invoice Settings" subtitle="Information shown on invoices and receipts." />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="Company Name">
          <input className={inputCls} value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
        </Field>
        <Field label="Invoice Prefix">
          <input className={inputCls} value={form.invoicePrefix} onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Company Address">
            <input className={inputCls} value={form.companyAddress} onChange={(e) => setForm({ ...form, companyAddress: e.target.value })} />
          </Field>
        </div>
        <Field label="Company Phone">
          <input className={inputCls} value={form.companyPhone} onChange={(e) => setForm({ ...form, companyPhone: e.target.value })} />
        </Field>
        <Field label="Company Email">
          <input type="email" className={inputCls} value={form.companyEmail} onChange={(e) => setForm({ ...form, companyEmail: e.target.value })} />
        </Field>
        <Field label="Tax Name">
          <input className={inputCls} value={form.taxName} onChange={(e) => setForm({ ...form, taxName: e.target.value })} />
        </Field>
        <Field label="Tax Rate (%)">
          <input type="number" step="0.1" className={inputCls} value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })} />
        </Field>
        <label className="flex items-center gap-2 md:col-span-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.showTax} onChange={(e) => setForm({ ...form, showTax: e.target.checked })} />
          Show tax line on invoices
        </label>
        <div className="md:col-span-2">
          <Field label="Invoice Footer Note">
            <textarea rows={3} className={inputCls} value={form.invoiceFooter} onChange={(e) => setForm({ ...form, invoiceFooter: e.target.value })} />
          </Field>
        </div>
      </div>
      <div className="mt-6"><SaveButton /></div>
    </form>
  );
}

function SocialLoginSettings({ onSave }: { onSave: () => void }) {
  const [providers, setProviders] = useState([
    { id: "google", name: "Google", enabled: true, clientId: "", clientSecret: "" },
    { id: "facebook", name: "Facebook", enabled: false, clientId: "", clientSecret: "" },
    { id: "apple", name: "Apple", enabled: false, clientId: "", clientSecret: "" },
    { id: "github", name: "GitHub", enabled: false, clientId: "", clientSecret: "" },
  ]);

  const toggle = (id: string) => {
    setProviders(providers.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)));
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(); }}>
      <SectionHeader title="Social Media Login" subtitle="Allow users to sign in using their social accounts." />
      <div className="space-y-4">
        {providers.map((p) => (
          <div key={p.id} className="rounded-lg border border-gray-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{p.name}</h3>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={p.enabled} onChange={() => toggle(p.id)} />
                <span>{p.enabled ? "Enabled" : "Disabled"}</span>
              </label>
            </div>
            {p.enabled && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Client ID"><input className={inputCls} defaultValue={p.clientId} /></Field>
                <Field label="Client Secret"><input type="password" className={inputCls} defaultValue={p.clientSecret} /></Field>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-6"><SaveButton /></div>
    </form>
  );
}
