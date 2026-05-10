// Tele-ICU dashboard composer.
//
// One call returns everything the command-center grid needs: each
// bed's metadata, latest vitals, NEWS2 score + band, recent alerts,
// active coverage. The route is hot-path (intensivists keep this
// open all shift), so we cache nothing — the underlying stores are
// in-memory anyway.

import { listAllBeds, listBedsForOrg, type TeleIcuBed } from "./bed-store";
import {
  listReadings,
  type WearableReading,
  type ReadingKind,
} from "../wearables/store";
import { computeNews2, type News2Result } from "./news2";
import {
  activeCoverageForBed,
  bedsCoveredBy,
  type IcuCoverage,
} from "./coverage-store";
import { getOrganizationById } from "../organizations-store";

export interface BedSnapshot {
  bed: TeleIcuBed;
  organizationName: string;
  /** Latest reading per kind, captured in the last hour. */
  latestVitals: Partial<Record<ReadingKind, { value: number; takenAt: string }>>;
  /** Last-N readings per kind for sparkline rendering. */
  trend: Partial<Record<ReadingKind, Array<{ value: number; takenAt: string }>>>;
  news2: News2Result | null;
  /** Active coverage row, if any. */
  coverage: IcuCoverage | null;
  /** Stale = no readings in 15 minutes; flagged in red on the grid. */
  stale: boolean;
}

const RECENT_READING_WINDOW_MS = 60 * 60 * 1000;     // 1h
const STALE_THRESHOLD_MS = 15 * 60 * 1000;           // 15min
const TREND_WINDOW_MS = 6 * 60 * 60 * 1000;          // 6h
const TREND_KINDS: ReadingKind[] = ["hr_resting", "spo2", "bp_systolic", "respiratory_rate", "temperature_c"];

function pickLatest(readings: WearableReading[]): { value: number; takenAt: string } {
  let latest = readings[0];
  for (const r of readings) {
    if (r.takenAt > latest.takenAt) latest = r;
  }
  return { value: latest.value, takenAt: latest.takenAt };
}

function buildVitalsForBed(bed: TeleIcuBed): {
  latestVitals: BedSnapshot["latestVitals"];
  trend: BedSnapshot["trend"];
  stale: boolean;
} {
  const latestVitals: BedSnapshot["latestVitals"] = {};
  const trend: BedSnapshot["trend"] = {};
  if (!bed.patientUserId) return { latestVitals, trend, stale: true };

  const fromIso = new Date(Date.now() - TREND_WINDOW_MS).toISOString();
  const recent = listReadings({ userId: bed.patientUserId, fromIso });
  // bucket by kind
  const byKind = new Map<ReadingKind, WearableReading[]>();
  for (const r of recent) {
    if (!byKind.has(r.kind)) byKind.set(r.kind, []);
    byKind.get(r.kind)!.push(r);
  }
  let latestAny: number | null = null;
  for (const [kind, rs] of byKind) {
    if (rs.length === 0) continue;
    const inLastHour = rs.filter((r) => Date.now() - new Date(r.takenAt).getTime() <= RECENT_READING_WINDOW_MS);
    if (inLastHour.length > 0) latestVitals[kind] = pickLatest(inLastHour);
    if (TREND_KINDS.includes(kind)) {
      trend[kind] = rs
        .slice()
        .sort((a, b) => a.takenAt.localeCompare(b.takenAt))
        .slice(-30)
        .map((r) => ({ value: r.value, takenAt: r.takenAt }));
    }
    const lastT = new Date(pickLatest(rs).takenAt).getTime();
    if (latestAny === null || lastT > latestAny) latestAny = lastT;
  }
  const stale = latestAny === null || Date.now() - latestAny > STALE_THRESHOLD_MS;
  return { latestVitals, trend, stale };
}

function bedSnapshot(bed: TeleIcuBed): BedSnapshot {
  const { latestVitals, trend, stale } = buildVitalsForBed(bed);
  let news2: News2Result | null = null;
  if (bed.patientUserId && Object.keys(latestVitals).length > 0) {
    news2 = computeNews2({
      hr: latestVitals.hr_resting?.value,
      spo2: latestVitals.spo2?.value,
      systolic: latestVitals.bp_systolic?.value,
      tempC: latestVitals.temperature_c?.value,
      rr: latestVitals.respiratory_rate?.value,
      onOxygen: Boolean(bed.ventilatorMode),
    });
  }
  const org = getOrganizationById(bed.organizationId);
  return {
    bed,
    organizationName: org?.name || "(unknown)",
    latestVitals,
    trend,
    news2,
    coverage: activeCoverageForBed(bed.id),
    stale,
  };
}

export interface DashboardFilter {
  organizationId?: string;
  /** When given, only return beds the intensivist is actively covering. */
  intensivistUserId?: string;
}

export function buildDashboard(filter: DashboardFilter = {}): BedSnapshot[] {
  let beds = filter.organizationId ? listBedsForOrg(filter.organizationId) : listAllBeds();
  if (filter.intensivistUserId) {
    const ids = new Set(bedsCoveredBy(filter.intensivistUserId));
    beds = beds.filter((b) => ids.has(b.id));
  }
  return beds.map(bedSnapshot);
}
