// POST /api/pharmacy/search
//
// Given the medicines from an Rx and the patient's current lat/lng,
// find the nearest pharmacies that can fill the script and return each
// store's line-item pricing + summary so the PharmacyPicker can render
// a compare-and-choose view.
//
// Progressive widening: we start with a 2km ring and expand through
// 5 → 10 → 25km until we find stores that cover at least one Rx line.
// This keeps latency low in dense neighborhoods without starving the
// patient if they live in a pharmacy desert.
//
// We never hard-fail on unmatched medicines — any Rx line whose name
// doesn't resolve to the catalog is returned as an "unmatched" entry
// so the UI can still show "3/4 items covered, 1 not stocked here".
//
// Input JSON:
//   { lat: number, lng: number, medicines: string[], delivery?: boolean }
//
// Output JSON:
//   { radiusKm, stores: StoreQuote[], unmatched: string[] }

import { NextRequest, NextResponse } from "next/server";
import { matchMedicine } from "@/lib/medicines-catalog";
import {
  findStoresNear,
  pickInventoryFor,
  type StoreLocation,
} from "@/lib/vendor-inventory-store";
import { SEARCH_RINGS_KM, isValidLatLng } from "@/lib/geo";

export const runtime = "nodejs";

interface StoreLine {
  rxLabel: string; // whatever the doctor wrote
  medicineId: string | null;
  catalogName?: string;
  brandLabel?: string;
  strength?: string;
  unit?: string;
  priceInr?: number;
  stock?: number;
  inStock: boolean;
}

interface StoreQuote {
  store: StoreLocation & { distanceKm: number };
  lines: StoreLine[];
  coveredCount: number;
  totalInr: number;
  pickup: boolean;
  delivery: boolean;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const input = body as {
    lat?: number;
    lng?: number;
    medicines?: string[];
    delivery?: boolean;
  };

  const origin = { lat: Number(input.lat), lng: Number(input.lng) };
  if (!isValidLatLng(origin)) {
    return NextResponse.json(
      { error: "Valid lat/lng required" },
      { status: 400 },
    );
  }

  const rawMeds = Array.isArray(input.medicines) ? input.medicines : [];
  const meds = rawMeds.map((s) => String(s || "").trim()).filter(Boolean).slice(0, 20);
  if (meds.length === 0) {
    return NextResponse.json(
      { error: "At least one medicine is required" },
      { status: 400 },
    );
  }

  // Resolve every Rx line to a catalog entry up front (or null).
  const resolved = meds.map((label) => ({
    label,
    match: matchMedicine(label),
  }));
  const unmatched = resolved.filter((r) => !r.match).map((r) => r.label);

  const requireDelivery = !!input.delivery;

  // Progressive widening: expand through the rings until we have at
  // least one store that covers ≥1 Rx line.
  let radiusUsedKm = SEARCH_RINGS_KM[SEARCH_RINGS_KM.length - 1];
  let quotes: StoreQuote[] = [];
  for (const km of SEARCH_RINGS_KM) {
    const stores = findStoresNear(origin, km, { requireDelivery });
    if (stores.length === 0) continue;
    quotes = stores.map((s) => buildQuote(s, resolved));
    const anyCovered = quotes.some((q) => q.coveredCount > 0);
    if (anyCovered) {
      radiusUsedKm = km;
      break;
    }
  }

  // Sort: most-covered first, then total price asc, then distance asc.
  quotes.sort((a, b) => {
    if (a.coveredCount !== b.coveredCount) return b.coveredCount - a.coveredCount;
    if (a.totalInr !== b.totalInr) return a.totalInr - b.totalInr;
    return a.store.distanceKm - b.store.distanceKm;
  });

  return NextResponse.json({
    radiusKm: radiusUsedKm,
    unmatched,
    stores: quotes,
  });
}

function buildQuote(
  store: StoreLocation & { distanceKm: number },
  resolved: Array<{ label: string; match: ReturnType<typeof matchMedicine> }>,
): StoreQuote {
  const lines: StoreLine[] = [];
  let covered = 0;
  let total = 0;
  for (const { label, match } of resolved) {
    if (!match) {
      lines.push({ rxLabel: label, medicineId: null, inStock: false });
      continue;
    }
    const inv = pickInventoryFor(store.id, match.id);
    if (!inv) {
      lines.push({
        rxLabel: label,
        medicineId: match.id,
        catalogName: match.generic,
        inStock: false,
      });
      continue;
    }
    lines.push({
      rxLabel: label,
      medicineId: match.id,
      catalogName: match.generic,
      brandLabel: inv.brandLabel,
      strength: inv.strength,
      unit: inv.unit,
      priceInr: inv.priceInr,
      stock: inv.stock,
      inStock: true,
    });
    covered++;
    total += inv.priceInr;
  }
  return {
    store,
    lines,
    coveredCount: covered,
    totalInr: total,
    pickup: store.pickup,
    delivery: store.delivery,
  };
}
