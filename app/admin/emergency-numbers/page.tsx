"use client";

// Super-admin editor for the emergency banner's per-country lookup
// table. Reads + writes via the existing /api/admin/settings PATCH
// using the `emergencyNumbers` section key (see lib/settings-store.ts).

import { useEffect, useMemo, useState } from "react";
import type {
  EmergencyNumberEntry,
  SiteSettings,
} from "@/lib/settings-store";
import { ISO_COUNTRIES } from "@/lib/iso-countries";

const inputCls =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20";

function countryLabel(code: string): string {
  if (code === "*") return "Default (everywhere else)";
  const c = ISO_COUNTRIES.find((x) => x.iso === code.toUpperCase());
  return c ? `${c.name} (${c.iso})` : code;
}

export default function AdminEmergencyNumbers() {
  const [rows, setRows] = useState<EmergencyNumberEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ text: string; err?: boolean } | null>(
    null
  );
  const [previewCountry, setPreviewCountry] = useState("");
  const [previewResult, setPreviewResult] = useState<{
    matched: string;
    localEmergency: string;
    helpline: string;
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/admin/settings", { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as { settings: SiteSettings };
        setRows(data.settings.emergencyNumbers || []);
      } catch (err) {
        showToast((err as Error).message, true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function showToast(text: string, err = false) {
    setToast({ text, err });
    setTimeout(() => setToast(null), 2500);
  }

  function updateRow(i: number, patch: Partial<EmergencyNumberEntry>) {
    setRows((cur) =>
      cur ? cur.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) : cur
    );
  }

  function addRow() {
    setRows((cur) => [
      ...(cur || []),
      { country: "", localEmergency: "", helpline: "" },
    ]);
  }

  function removeRow(i: number) {
    setRows((cur) => (cur ? cur.filter((_, idx) => idx !== i) : cur));
  }

  // Catch duplicates and empty rows before saving — server accepts the
  // list as-is, so the admin UI is the only gate here.
  const errors = useMemo(() => {
    if (!rows) return [] as string[];
    const out: string[] = [];
    const seen = new Map<string, number>();
    rows.forEach((r, i) => {
      const c = r.country.trim().toUpperCase();
      if (!c) {
        out.push(`Row ${i + 1}: country is required.`);
      } else if (c !== "*" && c.length !== 2) {
        out.push(
          `Row ${i + 1}: country must be a 2-letter ISO code (or "*").`
        );
      } else if (seen.has(c)) {
        out.push(
          `Row ${i + 1}: duplicate country "${c}" (already row ${
            (seen.get(c) ?? 0) + 1
          }).`
        );
      } else {
        seen.set(c, i);
      }
      if (!r.localEmergency.trim()) {
        out.push(`Row ${i + 1}: local emergency number is required.`);
      }
      if (!r.helpline.trim()) {
        out.push(`Row ${i + 1}: helpline is required.`);
      }
    });
    if (!seen.has("*")) {
      out.push(
        'No "*" fallback row — visitors from countries not in the list will see a hard-coded default.'
      );
    }
    return out;
  }, [rows]);

  async function save() {
    if (!rows) return;
    setSaving(true);
    try {
      const cleaned = rows.map((r) => ({
        country: r.country.trim().toUpperCase(),
        localEmergency: r.localEmergency.trim(),
        helpline: r.helpline.trim(),
      }));
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emergencyNumbers: cleaned }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { settings: SiteSettings };
      setRows(data.settings.emergencyNumbers || []);
      showToast("✓ Emergency numbers saved");
    } catch (err) {
      showToast((err as Error).message, true);
    } finally {
      setSaving(false);
    }
  }

  async function preview() {
    const c = previewCountry.trim().toUpperCase();
    if (!c) return;
    try {
      const res = await fetch(
        `/api/emergency-numbers?country=${encodeURIComponent(c)}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPreviewResult({
        matched: data.matched || data.country || "(fallback)",
        localEmergency: data.localEmergency,
        helpline: data.helpline,
      });
    } catch (err) {
      showToast((err as Error).message, true);
    }
  }

  return (
    <div>
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-red-600 via-orange-500 to-red-600 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-amber-300/30 blur-3xl" />
        <div className="relative">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <span className="animate-pulse text-base">&#128680;</span>
            Site-wide emergency banner
          </div>
          <h1 className="text-2xl font-bold">Emergency numbers</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/90">
            Per-country emergency and OduDoc helpline numbers shown in the
            red banner at the top of every public page. Visitors get the
            row matching their country (resolved from request IP); add a
            row with country <code className="font-mono">*</code> as the
            fallback when no other row matches.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl bg-white p-6 text-sm text-gray-500 shadow-sm ring-1 ring-gray-100">
          Loading…
        </div>
      ) : !rows ? (
        <div className="rounded-xl bg-white p-6 text-sm text-red-600 shadow-sm ring-1 ring-gray-100">
          Couldn&apos;t load settings.
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                <tr>
                  <th className="px-4 py-3">Country</th>
                  <th className="px-4 py-3">Local emergency</th>
                  <th className="px-4 py-3">OduDoc helpline</th>
                  <th className="px-4 py-3 text-right">&nbsp;</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r, i) => (
                  <tr key={i} className={r.country === "*" ? "bg-amber-50/40" : ""}>
                    <td className="px-4 py-2 align-top">
                      <input
                        className={`${inputCls} font-mono uppercase`}
                        value={r.country}
                        maxLength={3}
                        placeholder="US, IN, *"
                        onChange={(e) =>
                          updateRow(i, { country: e.target.value })
                        }
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        {countryLabel(r.country)}
                      </p>
                    </td>
                    <td className="px-4 py-2 align-top">
                      <input
                        className={inputCls}
                        value={r.localEmergency}
                        placeholder="911"
                        onChange={(e) =>
                          updateRow(i, { localEmergency: e.target.value })
                        }
                      />
                    </td>
                    <td className="px-4 py-2 align-top">
                      <input
                        className={inputCls}
                        value={r.helpline}
                        placeholder="+1 (302) 899-2625"
                        onChange={(e) =>
                          updateRow(i, { helpline: e.target.value })
                        }
                      />
                    </td>
                    <td className="px-4 py-2 text-right align-top">
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
              <button
                type="button"
                onClick={addRow}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
              >
                + Add country
              </button>
            </div>
          </div>

          {errors.length > 0 && (
            <ul className="mt-4 space-y-1 rounded-xl bg-amber-50 p-4 text-xs text-amber-800 ring-1 ring-amber-200">
              {errors.map((e, i) => (
                <li key={i}>• {e}</li>
              ))}
            </ul>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={save}
              disabled={saving || errors.length > 0}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>

            <div className="ml-auto flex items-center gap-2">
              <input
                className={`${inputCls} w-28 font-mono uppercase`}
                placeholder="Preview XX"
                value={previewCountry}
                maxLength={2}
                onChange={(e) => setPreviewCountry(e.target.value)}
              />
              <button
                type="button"
                onClick={preview}
                className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
              >
                Test lookup
              </button>
            </div>
          </div>

          {previewResult && (
            <div className="mt-4 rounded-xl bg-slate-900 p-4 text-sm text-slate-100 shadow">
              Matched row{" "}
              <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono">
                {previewResult.matched}
              </code>
              {" → "}
              <span className="font-semibold">
                {previewResult.localEmergency}
              </span>{" "}
              / {previewResult.helpline}
            </div>
          )}
        </>
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
