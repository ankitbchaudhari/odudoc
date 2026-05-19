// OSRM (Open Source Routing Machine) client for ambulance routing.
//
// Replaces the Haversine fallback in lib/ambulance-store with real
// road distance + ETA when OSRM_URL is set. OSRM exposes a public
// API at https://router.project-osrm.org but rate-limited; in
// production you self-host. Either way the contract is the same:
// GET /route/v1/{profile}/{coords}?overview=false
//
// Falls back to Haversine + the urban-2.5-min-per-km heuristic if
// OSRM isn't configured or returns an error. Same return shape so
// callers don't have to branch.

import { distanceKm } from "./ambulance-store";

export interface RouteResult {
  /** Distance in kilometres. */
  distanceKm: number;
  /** ETA in minutes. */
  etaMin: number;
  /** Where the answer came from. */
  source: "osrm" | "haversine";
}

export async function routeBetween(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): Promise<RouteResult> {
  const base = process.env.OSRM_URL;
  if (base) {
    try {
      const coords = `${fromLng},${fromLat};${toLng},${toLat}`;
      const url = `${base.replace(/\/$/, "")}/route/v1/driving/${coords}?overview=false`;
      const r = await fetch(url, {
        // Cache the routing answer for 60 s — the same caller often
        // re-runs the same query when previewing then dispatching.
        next: { revalidate: 60 },
      });
      if (r.ok) {
        const j = await r.json();
        const route = j?.routes?.[0];
        if (route && typeof route.distance === "number" && typeof route.duration === "number") {
          return {
            distanceKm: route.distance / 1000,
            etaMin: Math.max(1, Math.round(route.duration / 60)),
            source: "osrm",
          };
        }
      }
    } catch {
      /* fall through to Haversine */
    }
  }

  // Fallback: straight-line distance + urban average.
  const km = distanceKm(fromLat, fromLng, toLat, toLng);
  return {
    distanceKm: km,
    etaMin: Math.max(2, Math.round(km * 2.5)),
    source: "haversine",
  };
}
