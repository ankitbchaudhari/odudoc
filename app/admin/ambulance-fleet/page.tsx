"use client";

// Ambulance fleet board. Each vehicle: reg, class, status, last
// known location with an OpenStreetMap thumbnail. No real-time
// map (would need Leaflet dependency) — instead a coordinates
// readout + a 200px static tile pulled from OSM staticmap.

import { useCallback, useEffect, useState } from "react";

interface Vehicle {
  id: string;
  reg: string;
  class: "BLS" | "ALS" | "ICU" | "MORTUARY";
  crew: string[];
  lat: number;
  lng: number;
  status: "available" | "en_route" | "on_scene" | "transporting" | "out_of_service";
  lastPingAt: string;
}

const STATUS_TONE: Record<Vehicle["status"], string> = {
  available: "bg-emerald-100 text-emerald-800",
  en_route: "bg-orange-100 text-orange-800",
  on_scene: "bg-rose-100 text-rose-800",
  transporting: "bg-violet-100 text-violet-800",
  out_of_service: "bg-slate-200 text-slate-600",
};

const CLASS_TONE: Record<Vehicle["class"], string> = {
  BLS: "bg-sky-100 text-sky-800",
  ALS: "bg-amber-100 text-amber-900",
  ICU: "bg-rose-100 text-rose-900",
  MORTUARY: "bg-slate-200 text-slate-700",
};

function staticMapUrl(lat: number, lng: number): string {
  // OSM tile-server doesn't expose a static-map API; we use the
  // OpenStreetMap "wms" via staticmaps.osm.ch — public, attribution
  // included in the iframe-equivalent rendering below.
  // For an MVP we just deep-link to OpenStreetMap so the operator
  // can click through.
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=15`;
}

export default function AmbulanceFleetPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/ambulance/vehicles", { cache: "no-store" });
      const j = await r.json();
      setVehicles(j.vehicles || []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [refresh]);

  const available = vehicles.filter((v) => v.status === "available").length;
  const inService = vehicles.filter((v) => v.status !== "out_of_service").length;

  return (
    <main className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-600">Emergency · Fleet</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">Ambulance fleet</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Live status across all registered vehicles. Refreshes every 60 s. Click any vehicle to open its
          last-known location on OpenStreetMap.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="In service" value={`${inService}`} />
        <Stat label="Available" value={`${available}`} />
        <Stat label="Total fleet" value={`${vehicles.length}`} />
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        {loading && vehicles.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
            Loading…
          </p>
        ) : vehicles.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
            No vehicles registered. Add some via <a className="text-rose-600 hover:underline" href="/admin/fleet-devices">/admin/fleet-devices</a>.
          </p>
        ) : (
          vehicles.map((v) => (
            <article key={v.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-extrabold text-slate-900 dark:text-slate-100">{v.reg}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${CLASS_TONE[v.class]}`}>
                      {v.class}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_TONE[v.status]}`}>
                      {v.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                    Crew: {v.crew.length ? v.crew.join(", ") : "—"}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-slate-500">
                    ({v.lat.toFixed(5)}, {v.lng.toFixed(5)})
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Last ping {new Date(v.lastPingAt).toLocaleTimeString()}
                  </p>
                </div>
                <a
                  href={staticMapUrl(v.lat, v.lng)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white"
                >
                  Open map ↗
                </a>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-extrabold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}
