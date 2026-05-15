"use client";

// Enterprise plan customiser.
//
// The Hospital tier ships every clinical module. Enterprise buyers
// instead tell us which ones they actually want plus any custom
// integrations, and we send back a quote. This is a glorified
// multi-select + contact form, but having it inline on the pricing
// page lets prospects scope their own deal in under a minute.

import { useMemo, useState } from "react";
import { COUNTRY_DIAL_CODES } from "@/lib/country-dial-codes";

export interface ModuleGroup {
  label: string;
  items: { id: string; name: string }[];
}

interface Props {
  groups: ModuleGroup[];
}

export default function EnterpriseCustomiser({ groups }: Props) {
  const allIds = useMemo(
    () => groups.flatMap((g) => g.items.map((i) => i.id)),
    [groups],
  );

  const [selected, setSelected] = useState<Set<string>>(new Set(allIds));
  const [company, setCompany] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  // Defaults to India since that's the primary OduDoc market.
  // Operator can switch to any of the ~190 dial codes via the
  // dropdown next to the phone input. We track ISO (not dial)
  // because the same dial code can map to multiple countries
  // (US + CA = 1) and ISO keeps the intent explicit.
  const [phoneIso, setPhoneIso] = useState("IN");
  const [beds, setBeds] = useState("");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(allIds));
  const clearAll = () => setSelected(new Set());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const pickedNames = groups
        .flatMap((g) => g.items)
        .filter((i) => selected.has(i.id))
        .map((i) => i.name);

      const res = await fetch("/api/enterprise-leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          organizationName: company,
          contactName,
          contactEmail: email,
          contactPhone: phone.trim()
            ? `+${COUNTRY_DIAL_CODES.find((c) => c.iso === phoneIso)?.dial || ""} ${phone.trim()}`.trim()
            : undefined,
          bedsRange: beds || undefined,
          interestedModules: pickedNames,
          message: notes
            ? `[Enterprise customiser] ${notes}`
            : `[Enterprise customiser] Requested ${pickedNames.length} modules.`,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Request failed (${res.status})`);
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <h3 className="text-lg font-bold text-emerald-900">Request received</h3>
        <p className="mt-2 text-sm text-emerald-800">
          Thanks — our team will get back to you within one business day with a
          tailored quote for the {selected.size} modules you selected.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm sm:p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">Customise your Enterprise plan</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Pick the modules you need. We&apos;ll send a tailored quote with implementation timeline.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={selectAll}
            className="rounded-md border border-gray-200 dark:border-slate-700 px-3 py-1 font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="rounded-md border border-gray-200 dark:border-slate-700 px-3 py-1 font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            Clear
          </button>
          <span className="rounded-full bg-indigo-50 px-3 py-1 font-semibold text-indigo-700">
            {selected.size} selected
          </span>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">{g.label}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {g.items.map((m) => {
                const on = selected.has(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggle(m.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      on
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:border-indigo-300"
                    }`}
                  >
                    {on ? "✓ " : ""}
                    {m.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-4 border-t border-gray-100 pt-6 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Company / hospital</span>
          <input
            required
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="Apollo Group"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Beds / branches</span>
          <input
            value={beds}
            onChange={(e) => setBeds(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="250 beds · 4 branches"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Your name</span>
          <input
            required
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="Dr. Priya Sharma"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Work email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="priya@hospital.com"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Phone (optional)</span>
          {/* Country-code dropdown + national-number input. Sales gets
              a clean E.164-ish string on the lead row even when the
              prospect just types their local number. */}
          <div className="mt-1 flex gap-2">
            <select
              value={phoneIso}
              onChange={(e) => setPhoneIso(e.target.value)}
              className="w-28 shrink-0 rounded-md border border-gray-300 px-2 py-2 text-sm"
              aria-label="Country dialling code"
            >
              {COUNTRY_DIAL_CODES.map((c) => (
                <option key={c.iso} value={c.iso}>
                  {c.flag || ""} {c.iso} +{c.dial}
                </option>
              ))}
            </select>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d\s-]/g, ""))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="555 123 4567"
            />
          </div>
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">
            Custom requirements (integrations, regions, SLAs, …)
          </span>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="HL7 feeds to our existing LIS, single-tenant deployment in AP-South, 99.99% uptime SLA, …"
          />
        </label>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-xs text-gray-500">
          We&apos;ll only use this to send your quote. No automated marketing.
        </p>
        <button
          type="submit"
          disabled={sending || selected.size === 0}
          className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          {sending ? "Sending…" : `Request quote for ${selected.size} module${selected.size === 1 ? "" : "s"}`}
        </button>
      </div>
    </form>
  );
}
