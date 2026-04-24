// Tiny geo helpers for pharmacy proximity search.
//
// We keep this dependency-free: the haversine formula is a ~10-line
// function and we don't need sub-meter precision (pharmacy matching
// is happy with ±50m). No PostGIS, no turf.js.

const EARTH_KM = 6371;

export interface LatLng {
  lat: number;
  lng: number;
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Progressive widening rings used by the pharmacy search endpoint.
// Keeps the UX fast when the patient's neighborhood has coverage, but
// still finds something when they're in a pharmacy desert.
export const SEARCH_RINGS_KM = [2, 5, 10, 25] as const;

export function isValidLatLng(v: unknown): v is LatLng {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.lat === "number" &&
    typeof o.lng === "number" &&
    Number.isFinite(o.lat) &&
    Number.isFinite(o.lng) &&
    o.lat >= -90 &&
    o.lat <= 90 &&
    o.lng >= -180 &&
    o.lng <= 180
  );
}
