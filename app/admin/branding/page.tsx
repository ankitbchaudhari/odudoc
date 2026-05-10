"use client";

// Org branding admin — upload logos + theme.
//
// Org-context aware: uses the org-switcher in the header. Each
// upload is stored as a data URL inline (256 KB cap per asset)
// so demos and small deployments work without S3.

import { useCallback, useEffect, useRef, useState } from "react";

interface Branding {
  organizationId: string;
  logoLight?: string; logoDark?: string; favicon?: string;
  primaryColor?: string; accentColor?: string;
  displayName?: string; invoiceFooter?: string; watermarkText?: string;
  websiteUrl?: string;
  updatedAt: string;
}

const MAX_BYTES = 256 * 1024;

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export default function BrandingAdminPage() {
  const [orgId, setOrgId] = useState<string>("");
  const [branding, setBranding] = useState<Branding | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Org id is exposed by the existing header switcher via a custom
  // event + localStorage. Read it lazily so we don't crash if the
  // user lands here directly.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const read = () => {
      const id = localStorage.getItem("odudoc:active-org") || "";
      setOrgId(id);
    };
    read();
    const onChange = () => read();
    window.addEventListener("odudoc:active-org-changed", onChange);
    return () => window.removeEventListener("odudoc:active-org-changed", onChange);
  }, []);

  const load = useCallback(async () => {
    if (!orgId) { setBranding(null); return; }
    const r = await fetch(`/api/org-branding?orgId=${encodeURIComponent(orgId)}`, { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setBranding(d.branding || { organizationId: orgId, updatedAt: "" });
    }
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const save = async (patch: Partial<Branding>) => {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/org-branding", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId, ...patch }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ kind: "err", text: data.error || `Failed (${res.status})` });
        return;
      }
      setBranding(data.branding);
      setMsg({ kind: "ok", text: "Saved." });
    } finally { setBusy(false); }
  };

  if (!orgId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        Pick an organization from the header to manage its branding.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Branding</h2>
        <p className="mt-1 text-sm text-gray-500">
          Logo + theme + invoice footer for this org. Used on dashboards, billing PDFs, prescription pads, patient files, and the white-label sub-app.
        </p>
      </div>

      {msg && (
        <div className={`mb-4 rounded-lg border px-4 py-2.5 text-sm ${msg.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          {msg.text}
        </div>
      )}

      {/* Logo uploads */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <p className="mb-3 text-sm font-bold text-slate-900">Logos</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <AssetUploader
            label="Logo (light backgrounds)"
            current={branding?.logoLight}
            onChange={(data) => save({ logoLight: data })}
            disabled={busy}
          />
          <AssetUploader
            label="Logo (dark backgrounds)"
            current={branding?.logoDark}
            onChange={(data) => save({ logoDark: data })}
            disabled={busy}
            tone="dark"
          />
          <AssetUploader
            label="Favicon"
            current={branding?.favicon}
            onChange={(data) => save({ favicon: data })}
            disabled={busy}
          />
        </div>
      </section>

      {/* Colors */}
      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <p className="mb-3 text-sm font-bold text-slate-900">Theme colors</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ColorRow label="Primary" value={branding?.primaryColor} onSave={(c) => save({ primaryColor: c })} disabled={busy} />
          <ColorRow label="Accent" value={branding?.accentColor} onSave={(c) => save({ accentColor: c })} disabled={busy} />
        </div>
      </section>

      {/* Text fields */}
      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <p className="mb-3 text-sm font-bold text-slate-900">Text</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Display name on documents" value={branding?.displayName} onSave={(v) => save({ displayName: v })} disabled={busy} placeholder="e.g. Apollo Hospital — Hyderabad" />
          <TextField label="Website URL" value={branding?.websiteUrl} onSave={(v) => save({ websiteUrl: v })} disabled={busy} placeholder="https://example.com" />
          <TextField label="Watermark text (internal docs)" value={branding?.watermarkText} onSave={(v) => save({ watermarkText: v })} disabled={busy} placeholder="Defaults to display name" />
          <TextField label="Invoice footer" value={branding?.invoiceFooter} onSave={(v) => save({ invoiceFooter: v })} disabled={busy} placeholder="GSTIN · Reg. address · Helpline" />
        </div>
      </section>

      {/* Live preview */}
      {(branding?.logoLight || branding?.primaryColor) && (
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="mb-3 text-sm font-bold text-slate-900">Preview</p>
          <BillingPreview branding={branding!} />
        </section>
      )}
    </div>
  );
}

function AssetUploader({ label, current, onChange, disabled, tone = "light" }: {
  label: string; current?: string; onChange: (data: string) => void; disabled?: boolean; tone?: "light" | "dark";
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError(`Max ${fmtBytes(MAX_BYTES)} (this is ${fmtBytes(file.size)}).`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-slate-700">{label}</p>
      <div className={`flex h-28 items-center justify-center rounded-xl ring-1 ring-slate-200 ${tone === "dark" ? "bg-slate-900" : "bg-slate-50"}`}>
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt={label} className="max-h-20 max-w-[80%] object-contain" />
        ) : (
          <span className={`text-xs ${tone === "dark" ? "text-slate-500" : "text-slate-400"}`}>No upload</span>
        )}
      </div>
      <div className="mt-2 flex gap-2">
        <input ref={ref} type="file" accept="image/*" onChange={handle} className="hidden" />
        <button onClick={() => ref.current?.click()} disabled={disabled} className="flex-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
          {current ? "Replace" : "Upload"}
        </button>
        {current && (
          <button onClick={() => onChange("")} disabled={disabled} className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50 disabled:opacity-50">
            Remove
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-[10px] text-rose-700">{error}</p>}
      <p className="mt-1 text-[10px] text-slate-400">Up to {fmtBytes(MAX_BYTES)}. Auto-resized into the surface.</p>
    </div>
  );
}

function ColorRow({ label, value, onSave, disabled }: { label: string; value?: string; onSave: (c: string) => void; disabled?: boolean }) {
  const [draft, setDraft] = useState(value || "#4f46e5");
  useEffect(() => { setDraft(value || "#4f46e5"); }, [value]);
  return (
    <label className="text-xs font-semibold text-slate-700">
      {label}
      <div className="mt-1 flex items-center gap-2">
        <input type="color" value={draft} onChange={(e) => setDraft(e.target.value)} className="h-9 w-12 rounded-lg border border-slate-300" />
        <input type="text" value={draft} onChange={(e) => setDraft(e.target.value)} className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal tabular-nums" />
        <button disabled={disabled} onClick={() => onSave(draft)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Save</button>
      </div>
    </label>
  );
}

function TextField({ label, value, onSave, disabled, placeholder }: { label: string; value?: string; onSave: (v: string) => void; disabled?: boolean; placeholder?: string }) {
  const [draft, setDraft] = useState(value || "");
  useEffect(() => { setDraft(value || ""); }, [value]);
  const dirty = draft !== (value || "");
  return (
    <label className="text-xs font-semibold text-slate-700">
      {label}
      <div className="mt-1 flex items-center gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" />
        <button disabled={disabled || !dirty} onClick={() => onSave(draft)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Save</button>
      </div>
    </label>
  );
}

function BillingPreview({ branding }: { branding: Branding }) {
  const primary = branding.primaryColor || "#4f46e5";
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3" style={{ borderTopColor: primary, borderTopWidth: 4 }}>
        <div className="flex items-center gap-3">
          {branding.logoLight ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoLight} alt="" className="h-10 w-auto object-contain" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg text-xs font-extrabold text-white" style={{ background: primary }}>
              {(branding.displayName || "OD").slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-bold text-slate-900">{branding.displayName || "Your organization"}</p>
            {branding.websiteUrl && <p className="text-[10px] text-slate-500">{branding.websiteUrl}</p>}
          </div>
        </div>
        <p className="text-xs uppercase tracking-wider text-slate-500">Invoice / Receipt</p>
      </div>
      <div className="px-5 py-4 text-sm text-slate-700">
        <p className="text-xs uppercase tracking-wider text-slate-500">Sample line</p>
        <div className="mt-1 flex justify-between">
          <span>Consultation — General medicine</span>
          <span className="tabular-nums">₹500.00</span>
        </div>
        <div className="mt-2 border-t border-slate-100 pt-2 flex justify-between font-bold">
          <span>Total</span>
          <span style={{ color: primary }}>₹500.00</span>
        </div>
      </div>
      <div className="border-t border-slate-200 bg-slate-50 px-5 py-2 text-[10px] text-slate-500">
        {branding.invoiceFooter || "Footer text — set in branding settings."}
        <span className="ml-2 text-slate-400">· Generated by OduDoc</span>
      </div>
    </div>
  );
}
