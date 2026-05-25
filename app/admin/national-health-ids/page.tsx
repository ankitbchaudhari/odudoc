"use client";

// Super-admin editor for the global national-health-id catalogue.
//
// Layout: country picker on the left, single-system editor on the
// right. Each country's row in the picker shows the system name +
// agency at a glance, with a colored dot for the override state:
//   • grey  = base catalogue entry, no admin edits
//   • blue  = admin has overridden fields
//   • amber = admin disabled this system for the country
//   • green = admin added this entry (not in base catalogue)
//
// Edits never mutate the base catalogue — every save POSTs only the
// overrides list back to /api/admin/settings, which persists to
// app_kv and recompiles regex patterns at read time.

import { useEffect, useMemo, useState } from "react";
import type { NationalHealthIdOverride } from "@/lib/settings-store";

type Coverage = "national" | "subnational" | "voluntary";

interface SerializedEntry {
  country: string;
  countryName: string;
  systemId: string;
  systemName: string;
  nativeName?: string;
  agency: string;
  digitalHealthNetwork?: string;
  format: { patternStr: string; placeholder: string; helpText?: string };
  alternates?: Array<{
    id: string;
    name: string;
    format: { patternStr?: string; pattern?: string; placeholder: string };
  }>;
  learnMoreUrl?: string;
  coverage: Coverage;
}

interface ApiResponse {
  base: SerializedEntry[];
  merged: SerializedEntry[];
  overrides: NationalHealthIdOverride[];
}

const inputCls =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20";

export default function AdminNationalHealthIds() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<NationalHealthIdOverride | null>(null);
  const [toast, setToast] = useState<{ text: string; err?: boolean } | null>(
    null
  );

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/national-health-ids", {
        cache: "no-store",
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as ApiResponse;
      setData(j);
      if (!activeKey && j.merged.length > 0) {
        const first = j.merged[0];
        setActiveKey(`${first.country}::${first.systemId}`);
      }
    } catch (err) {
      showToast((err as Error).message, true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showToast(text: string, err = false) {
    setToast({ text, err });
    setTimeout(() => setToast(null), 2500);
  }

  // Indexes for fast lookup. Recomputed whenever data changes.
  const byKey = useMemo(() => {
    const merged = new Map<string, SerializedEntry>();
    const base = new Map<string, SerializedEntry>();
    const override = new Map<string, NationalHealthIdOverride>();
    if (data) {
      for (const e of data.merged) merged.set(`${e.country}::${e.systemId}`, e);
      for (const e of data.base) base.set(`${e.country}::${e.systemId}`, e);
      for (const o of data.overrides)
        override.set(`${o.country.toUpperCase()}::${o.systemId}`, o);
    }
    return { merged, base, override };
  }, [data]);

  const visibleEntries = useMemo(() => {
    if (!data) return [] as SerializedEntry[];
    const q = search.trim().toLowerCase();
    if (!q) return data.merged;
    return data.merged.filter(
      (e) =>
        e.countryName.toLowerCase().includes(q) ||
        e.country.toLowerCase().includes(q) ||
        e.systemName.toLowerCase().includes(q) ||
        e.systemId.toLowerCase().includes(q) ||
        e.agency.toLowerCase().includes(q),
    );
  }, [data, search]);

  // When the user picks a row, seed the draft from any existing
  // override OR from the base entry's current values.
  useEffect(() => {
    if (!activeKey || !data) {
      setDraft(null);
      return;
    }
    const ov = byKey.override.get(activeKey);
    if (ov) {
      setDraft({ ...ov });
      return;
    }
    const base = byKey.merged.get(activeKey);
    if (!base) {
      setDraft(null);
      return;
    }
    setDraft({
      country: base.country,
      systemId: base.systemId,
      systemName: base.systemName,
      nativeName: base.nativeName,
      agency: base.agency,
      digitalHealthNetwork: base.digitalHealthNetwork,
      patternStr: base.format.patternStr,
      placeholder: base.format.placeholder,
      helpText: base.format.helpText,
      learnMoreUrl: base.learnMoreUrl,
      coverage: base.coverage,
    });
  }, [activeKey, data, byKey]);

  function rowState(e: SerializedEntry): "base" | "edited" | "disabled" | "added" {
    const key = `${e.country}::${e.systemId}`;
    const ov = byKey.override.get(key);
    if (!ov) return "base";
    if (ov.disabled) return "disabled";
    const inBase = byKey.base.has(key);
    return inBase ? "edited" : "added";
  }

  async function save() {
    if (!draft || !data) return;
    setSaving(true);
    try {
      // Replace any existing override for this (country, systemId)
      // with the draft. Other rows pass through unchanged.
      const key = `${draft.country.toUpperCase()}::${draft.systemId}`;
      const filtered = data.overrides.filter(
        (o) => `${o.country.toUpperCase()}::${o.systemId}` !== key,
      );
      // Strip empty optional fields so the persisted blob stays tight.
      const cleaned: NationalHealthIdOverride = {
        country: draft.country.toUpperCase(),
        systemId: draft.systemId,
      };
      const copyIfSet = (k: keyof NationalHealthIdOverride, val: unknown) => {
        if (typeof val === "string" && val.trim()) {
          (cleaned as Record<string, unknown>)[k] = val.trim();
        } else if (typeof val === "boolean") {
          (cleaned as Record<string, unknown>)[k] = val;
        }
      };
      copyIfSet("systemName", draft.systemName);
      copyIfSet("nativeName", draft.nativeName);
      copyIfSet("agency", draft.agency);
      copyIfSet("digitalHealthNetwork", draft.digitalHealthNetwork);
      copyIfSet("patternStr", draft.patternStr);
      copyIfSet("placeholder", draft.placeholder);
      copyIfSet("helpText", draft.helpText);
      copyIfSet("learnMoreUrl", draft.learnMoreUrl);
      if (draft.coverage) cleaned.coverage = draft.coverage;
      if (draft.disabled) cleaned.disabled = true;
      const next = [...filtered, cleaned];
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nationalHealthIdsOverrides: next }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      showToast("✓ Saved");
      await load();
    } catch (err) {
      showToast((err as Error).message, true);
    } finally {
      setSaving(false);
    }
  }

  async function resetEntry() {
    if (!draft || !data) return;
    setSaving(true);
    try {
      const key = `${draft.country.toUpperCase()}::${draft.systemId}`;
      const next = data.overrides.filter(
        (o) => `${o.country.toUpperCase()}::${o.systemId}` !== key,
      );
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nationalHealthIdsOverrides: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast("✓ Reverted to defaults");
      await load();
    } catch (err) {
      showToast((err as Error).message, true);
    } finally {
      setSaving(false);
    }
  }

  function addNew() {
    setDraft({
      country: "",
      systemId: "",
      systemName: "",
      agency: "",
      placeholder: "",
      patternStr: ".+",
      coverage: "voluntary",
    });
    setActiveKey("__new__");
  }

  const isNew = activeKey === "__new__";

  return (
    <div>
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-teal-700 via-emerald-700 to-cyan-800 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="relative">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            🌍 Worldwide health IDs
          </div>
          <h1 className="text-2xl font-bold">National health ID catalogue</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/90">
            One row per country&apos;s health-system identifier (ABHA, NHS,
            Medicare, Carte Vitale, …). Edit the agency, format, native
            name, or digital-health network for any country, or add a
            new one. Used by patient lookup and any future per-country
            integration.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl bg-white p-6 text-sm text-gray-500 shadow-sm ring-1 ring-gray-100">
          Loading…
        </div>
      ) : !data ? (
        <div className="rounded-xl bg-white p-6 text-sm text-red-600 shadow-sm ring-1 ring-gray-100">
          Couldn&apos;t load catalogue.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Country list */}
          <aside className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
            <div className="border-b border-gray-100 p-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country, agency, system…"
                className={`${inputCls} text-xs`}
              />
              <button
                type="button"
                onClick={addNew}
                className="mt-2 w-full rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-primary-400 hover:bg-primary-50"
              >
                + Add a country / system
              </button>
            </div>
            <ul className="max-h-[640px] overflow-y-auto py-1">
              {visibleEntries.map((e) => {
                const key = `${e.country}::${e.systemId}`;
                const state = rowState(e);
                const active = key === activeKey;
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => setActiveKey(key)}
                      className={`flex w-full items-start gap-2 px-3 py-2 text-left ${
                        active
                          ? "bg-primary-50 text-primary-900"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <Dot state={state} />
                      <span className="flex-1 min-w-0">
                        <span className="block truncate text-sm font-semibold text-gray-900">
                          {e.countryName}{" "}
                          <span className="font-mono text-[10px] text-gray-400">
                            {e.country}
                          </span>
                        </span>
                        <span className="block truncate text-xs text-gray-500">
                          {e.systemName}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
              {visibleEntries.length === 0 && (
                <li className="px-3 py-6 text-center text-xs text-gray-400">
                  No matches.
                </li>
              )}
            </ul>
          </aside>

          {/* Editor pane */}
          <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            {!draft ? (
              <p className="text-sm text-gray-500">Pick a country on the left, or add a new one.</p>
            ) : (
              <Editor
                draft={draft}
                isNew={isNew}
                setDraft={setDraft}
                save={save}
                reset={resetEntry}
                saving={saving}
                hasOverride={
                  !!byKey.override.get(
                    `${draft.country.toUpperCase()}::${draft.systemId}`,
                  )
                }
              />
            )}
          </section>
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg ${
            toast.err ? "bg-red-600" : "bg-emerald-600"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}

function Dot({ state }: { state: "base" | "edited" | "disabled" | "added" }) {
  const cls =
    state === "base"
      ? "bg-gray-300"
      : state === "edited"
        ? "bg-blue-500"
        : state === "disabled"
          ? "bg-amber-500"
          : "bg-emerald-500";
  return <span className={`mt-1.5 inline-flex h-2 w-2 shrink-0 rounded-full ${cls}`} />;
}

function Editor({
  draft,
  isNew,
  setDraft,
  save,
  reset,
  saving,
  hasOverride,
}: {
  draft: NationalHealthIdOverride;
  isNew: boolean;
  setDraft: (d: NationalHealthIdOverride) => void;
  save: () => void;
  reset: () => void;
  saving: boolean;
  hasOverride: boolean;
}) {
  const set = (k: keyof NationalHealthIdOverride, v: unknown) =>
    setDraft({ ...draft, [k]: v });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Country (ISO-2)" required>
          <input
            className={`${inputCls} font-mono uppercase`}
            maxLength={2}
            value={draft.country}
            onChange={(e) => set("country", e.target.value.toUpperCase())}
            disabled={!isNew}
            placeholder="IN"
          />
        </Field>
        <Field label="System ID (stable key)" required>
          <input
            className={`${inputCls} font-mono`}
            value={draft.systemId}
            onChange={(e) => set("systemId", e.target.value)}
            disabled={!isNew}
            placeholder="abha-number"
          />
        </Field>
        <Field label="System name" required>
          <input
            className={inputCls}
            value={draft.systemName || ""}
            onChange={(e) => set("systemName", e.target.value)}
            placeholder="ABHA Number"
          />
        </Field>
        <Field label="Native name">
          <input
            className={inputCls}
            value={draft.nativeName || ""}
            onChange={(e) => set("nativeName", e.target.value)}
            placeholder="आभा संख्या"
          />
        </Field>
        <Field label="Issuing agency" required>
          <input
            className={inputCls}
            value={draft.agency || ""}
            onChange={(e) => set("agency", e.target.value)}
            placeholder="National Health Authority (NHA)"
          />
        </Field>
        <Field label="Digital health network">
          <input
            className={inputCls}
            value={draft.digitalHealthNetwork || ""}
            onChange={(e) => set("digitalHealthNetwork", e.target.value)}
            placeholder="ABDM"
          />
        </Field>
        <Field label="Format pattern (regex source)">
          <input
            className={`${inputCls} font-mono`}
            value={draft.patternStr || ""}
            onChange={(e) => set("patternStr", e.target.value)}
            placeholder="^[0-9]{14}$"
          />
        </Field>
        <Field label="Placeholder text" required>
          <input
            className={inputCls}
            value={draft.placeholder || ""}
            onChange={(e) => set("placeholder", e.target.value)}
            placeholder="14 digits (e.g. 91-1234-5678-9012)"
          />
        </Field>
        <Field label="Help text">
          <input
            className={inputCls}
            value={draft.helpText || ""}
            onChange={(e) => set("helpText", e.target.value)}
            placeholder="Issued via abdm.gov.in."
          />
        </Field>
        <Field label="Learn-more URL">
          <input
            className={inputCls}
            value={draft.learnMoreUrl || ""}
            onChange={(e) => set("learnMoreUrl", e.target.value)}
            placeholder="https://abdm.gov.in/"
          />
        </Field>
        <Field label="Coverage">
          <select
            className={inputCls}
            value={draft.coverage || "voluntary"}
            onChange={(e) =>
              set("coverage", e.target.value as "national" | "subnational" | "voluntary")
            }
          >
            <option value="national">National (single country-wide ID)</option>
            <option value="subnational">Subnational (state/province)</option>
            <option value="voluntary">Voluntary / partial</option>
          </select>
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={!!draft.disabled}
          onChange={(e) => set("disabled", e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        <span>Disable this system (hide from catalogue)</span>
      </label>

      <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
        >
          {saving ? "Saving…" : isNew ? "Add to catalogue" : "Save override"}
        </button>
        {hasOverride && !isNew && (
          <button
            type="button"
            onClick={reset}
            disabled={saving}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            Revert to default
          </button>
        )}
        <p className="ml-auto text-[11px] text-gray-500">
          Legend:{" "}
          <span className="ml-1 inline-flex items-center gap-1">
            <span className="inline-flex h-2 w-2 rounded-full bg-gray-300" /> base
          </span>{" "}
          <span className="ml-2 inline-flex items-center gap-1">
            <span className="inline-flex h-2 w-2 rounded-full bg-blue-500" /> edited
          </span>{" "}
          <span className="ml-2 inline-flex items-center gap-1">
            <span className="inline-flex h-2 w-2 rounded-full bg-amber-500" /> disabled
          </span>{" "}
          <span className="ml-2 inline-flex items-center gap-1">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" /> added
          </span>
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-600">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
