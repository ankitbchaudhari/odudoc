"use client";

// /admin/abdm — paste NHA-issued ABDM credentials here. Until
// `enabled` is true and clientId / clientSecret are set, every
// ABDM endpoint runs in sandbox-stub mode (saves the field
// values, never calls NHA).

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface Config {
  enabled: boolean;
  environment: "sandbox" | "production";
  baseUrl?: string;
  clientId?: string;
  hiuId?: string;
  hipId?: string;
  updatedAt?: string;
  updatedBy?: string;
  clientSecretSet: boolean;
  clientSecretPreview?: string;
}

export default function AbdmConfigPage() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/abdm/config", { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load");
      const data = await res.json();
      setCfg(data.config);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(patch: Partial<Config> & { clientSecret?: string }) {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/abdm/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setCfg(data.config);
      setSuccess("Saved.");
      setSecret("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !cfg) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="h-32 animate-pulse rounded-3xl bg-slate-200" />
      </div>
    );
  }

  const ready =
    cfg.enabled &&
    !!cfg.clientId &&
    cfg.clientSecretSet;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-wider text-orange-700">
          Compliance · Government integration
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
          Ayushman Bharat Digital Mission
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Paste the credentials NHA issues after sandbox onboarding at{" "}
          <a
            href="https://sandbox.abdm.gov.in/"
            target="_blank"
            rel="noreferrer"
            className="text-indigo-700 underline"
          >
            sandbox.abdm.gov.in
          </a>
          . Until both <code>clientId</code> and <code>clientSecret</code> are
          set and <b>Enabled</b> is on, ABDM endpoints run in stub mode —
          ABHA / HPR ids get saved but no real NHA call is made. India-only;
          all ABDM UI is hidden from non-Indian users platform-wide.
        </p>
      </div>

      {/* Status */}
      <div
        className={`mb-6 rounded-3xl border p-5 ${
          ready
            ? "border-emerald-200 bg-emerald-50"
            : cfg.enabled
              ? "border-amber-200 bg-amber-50"
              : "border-slate-200 bg-slate-50"
        }`}
      >
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
          Status
        </p>
        <p className="mt-1 text-base font-bold text-slate-900">
          {ready
            ? `✓ Live — ${cfg.environment} mode`
            : cfg.enabled
              ? "Enabled — credentials missing (running in stub mode)"
              : "Disabled — all ABDM UI hidden from users"}
        </p>
        {cfg.updatedAt && (
          <p className="mt-1 text-xs text-slate-500">
            Last updated {new Date(cfg.updatedAt).toLocaleString()}
            {cfg.updatedBy ? ` by ${cfg.updatedBy}` : ""}
          </p>
        )}
      </div>

      {/* Form */}
      <div className="overflow-hidden rounded-3xl border border-white/60 bg-white shadow-sm">
        <div className="space-y-4 p-6">
          {/* Master switch */}
          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <input
              type="checkbox"
              checked={cfg.enabled}
              onChange={(e) => save({ enabled: e.target.checked })}
              disabled={saving}
              className="mt-1 h-5 w-5"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900">
                Enable ABDM features platform-wide
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                When off, all ABDM UI surfaces hide themselves and the
                endpoints return "ABDM not enabled" errors. Toggle on after
                you have sandbox credentials.
              </p>
            </div>
          </label>

          {/* Environment */}
          <div>
            <p className="mb-1.5 text-xs font-semibold text-slate-700">
              Environment
            </p>
            <div className="flex gap-2">
              {(["sandbox", "production"] as const).map((env) => (
                <button
                  key={env}
                  onClick={() => save({ environment: env })}
                  disabled={saving}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    cfg.environment === env
                      ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  } disabled:opacity-50`}
                >
                  {env === "sandbox" ? "Sandbox" : "Production"}
                </button>
              ))}
            </div>
          </div>

          {/* Credentials */}
          <CredField
            label="Client ID"
            value={cfg.clientId || ""}
            onSave={(v) => save({ clientId: v })}
            disabled={saving}
            placeholder="ABDM-issued client id"
          />

          <div>
            <p className="mb-1.5 text-xs font-semibold text-slate-700">
              Client Secret{" "}
              {cfg.clientSecretSet && cfg.clientSecretPreview && (
                <span className="ml-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-mono text-emerald-700">
                  {cfg.clientSecretPreview}
                </span>
              )}
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder={
                  cfg.clientSecretSet
                    ? "(leave blank to keep current)"
                    : "Paste new client secret"
                }
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-mono outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
              />
              <button
                onClick={() => save({ clientSecret: secret })}
                disabled={saving || !secret.trim()}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-50"
              >
                Save
              </button>
              {cfg.clientSecretSet && (
                <button
                  onClick={() => save({ clientSecret: "" })}
                  disabled={saving}
                  className="rounded-xl px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                  title="Clear the saved secret"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <CredField
            label="HIU ID (Health Information User)"
            value={cfg.hiuId || ""}
            onSave={(v) => save({ hiuId: v })}
            disabled={saving}
            placeholder="Issued after M1 certification"
          />
          <CredField
            label="HIP ID (Health Information Provider)"
            value={cfg.hipId || ""}
            onSave={(v) => save({ hipId: v })}
            disabled={saving}
            placeholder="Issued after M2 certification"
          />
          <CredField
            label="Gateway URL override"
            value={cfg.baseUrl || ""}
            onSave={(v) => save({ baseUrl: v })}
            disabled={saving}
            placeholder="Leave blank to use NHA defaults"
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      <p className="mt-6 text-xs text-slate-500">
        ← <Link href="/admin" className="text-indigo-600 hover:underline">Back to admin</Link>
      </p>
    </div>
  );
}

function CredField({
  label,
  value,
  onSave,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  disabled: boolean;
  placeholder: string;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const dirty = draft !== value;
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-slate-700">{label}</p>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
        />
        <button
          onClick={() => onSave(draft.trim())}
          disabled={disabled || !dirty}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  );
}
