"use client";

// Patient home-healthcare booking. Pulls the service catalogue,
// patient picks one, schedules a visit. Visit list (their own
// upcoming + past) renders below.

import { useCallback, useEffect, useState } from "react";

type Kind = "dialysis" | "skilled_nursing" | "physiotherapy";

interface Service {
  id: string;
  kind: Kind;
  name: string;
  description: string;
  priceUsd: number;
  packageOf?: { weeks: number; sessions: number; priceUsd: number };
  active: boolean;
}

const KIND_META: Record<Kind, { label: string; emoji: string; tone: string }> = {
  dialysis:        { label: "Dialysis",        emoji: "🩸", tone: "from-rose-400 to-pink-600" },
  skilled_nursing: { label: "Skilled nursing", emoji: "👩‍⚕️", tone: "from-emerald-400 to-teal-600" },
  physiotherapy:   { label: "Physiotherapy",   emoji: "🦵", tone: "from-amber-400 to-orange-600" },
};

export default function HomeCarePage() {
  const [services, setServices] = useState<Service[]>([]);
  const [kindFilter, setKindFilter] = useState<Kind | "">("");
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Service | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/home-healthcare${kindFilter ? `?kind=${kindFilter}` : ""}`, { cache: "no-store" });
      const j = await r.json();
      setServices(j.services || []);
    } finally { setLoading(false); }
  }, [kindFilter]);
  useEffect(() => { refresh(); }, [refresh]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">Home healthcare</p>
      <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">Care at home</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Dialysis, skilled nursing, and physiotherapy delivered to your address. Pick a service, schedule
        the first visit — provider tracking + EMR sync happen once the provider accepts.
      </p>

      <div className="mt-6 flex gap-2">
        {(["", "dialysis", "skilled_nursing", "physiotherapy"] as const).map((k) => (
          <button
            key={k || "all"}
            onClick={() => setKindFilter(k as Kind | "")}
            className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${
              kindFilter === k
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {k ? KIND_META[k as Kind].label : "All"}
          </button>
        ))}
      </div>

      <section className="mt-6 grid gap-3 md:grid-cols-2">
        {loading && services.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
            Loading…
          </p>
        ) : services.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
            No services available in this category right now.
          </p>
        ) : (
          services.map((s) => {
            const meta = KIND_META[s.kind];
            return (
              <article key={s.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start gap-3">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${meta.tone} text-lg shadow`}>
                    {meta.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 dark:text-slate-100">{s.name}</p>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{s.description}</p>
                    <p className="mt-2 text-sm">
                      <strong>${s.priceUsd}</strong> per visit
                      {s.packageOf && <> · <em>package: {s.packageOf.sessions} sessions over {s.packageOf.weeks} weeks for ${s.packageOf.priceUsd}</em></>}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setBooking(s)}
                  className="mt-3 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-2 text-sm font-bold text-white shadow"
                >
                  Schedule visit
                </button>
              </article>
            );
          })
        )}
      </section>

      {booking && (
        <BookingModal service={booking} onClose={() => setBooking(null)} onBooked={() => setBooking(null)} />
      )}
    </main>
  );
}

function BookingModal({ service, onClose, onBooked }: { service: Service; onClose: () => void; onBooked: () => void }) {
  const [address, setAddress] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/home-healthcare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          address,
          scheduledFor,
        }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || "Failed"); return; }
      setDone(true);
      setTimeout(onBooked, 1500);
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Schedule {service.name}</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">${service.priceUsd} per visit</p>

        {done ? (
          <div className="mt-6 rounded-2xl bg-emerald-50 p-6 text-center dark:bg-emerald-950/30">
            <p className="text-3xl">✓</p>
            <p className="mt-2 text-base font-bold text-emerald-900 dark:text-emerald-100">Visit requested</p>
            <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
              We&apos;ll assign a provider and confirm by SMS within an hour.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Address</span>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  placeholder="Door no, street, area, city, pincode"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">When</span>
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </label>
              {error && <p className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{error}</p>}
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-700">
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={busy || !address || !scheduledFor}
                className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-sm font-bold text-white shadow disabled:opacity-60"
              >
                {busy ? "Booking…" : `Confirm · $${service.priceUsd}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
