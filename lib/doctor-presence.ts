// Lightweight presence (online / last-seen) for the doctor directory.
// Demo-only: status is deterministic per-doctor per time-bucket so it
// shifts naturally over time without needing a backend. Swap this out
// for a real /api/presence call once you have websockets / polling.

export interface DoctorPresence {
  online: boolean;
  lastSeenMinutesAgo: number; // 0 when online
  inCall: boolean; // true ≈ 15% of online doctors are currently in a consultation
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Deterministic presence for a doctor.
 * Rotates every ~5 minutes so the page feels alive across visits
 * without causing hydration mismatches within the same minute.
 */
export function getDoctorPresence(
  doctorId: string,
  nowMs: number = Date.now()
): DoctorPresence {
  const bucket5min = Math.floor(nowMs / (5 * 60 * 1000));
  const bucket30min = Math.floor(nowMs / (30 * 60 * 1000));
  const hash = hashString(doctorId);

  // ~60% of doctors online at any given moment
  const onlineSeed = (hash + bucket5min * 13) % 100;
  const online = onlineSeed < 60;

  // Of online doctors, about 20% are currently in a call
  const inCall = online && (hash + bucket5min * 7) % 100 < 20;

  // Offline: 1–180 min ago, stable over 30-min window so the text doesn't jitter
  const lastSeenMinutesAgo = online
    ? 0
    : (((hash >>> 3) + bucket30min * 11) % 180) + 1;

  return { online, lastSeenMinutesAgo, inCall };
}

export function formatLastSeen(minutes: number): string {
  if (minutes <= 0) return "Online now";
  if (minutes < 60) return `Last seen ${minutes} min ago`;
  const h = Math.floor(minutes / 60);
  if (h < 24) return `Last seen ${h}h ago`;
  const d = Math.floor(h / 24);
  return `Last seen ${d}d ago`;
}

// ---------------------------------------------------------------------------
// Patient presence — same deterministic engine, different distribution.
// Patients check the app less often than doctors, so a lower "online" rate
// and a longer last-seen window (up to a few days) feels more realistic.
// ---------------------------------------------------------------------------

export interface PatientPresence {
  online: boolean;
  lastSeenMinutesAgo: number;
}

export function getPatientPresence(
  patientKey: string,
  nowMs: number = Date.now()
): PatientPresence {
  const bucket5min = Math.floor(nowMs / (5 * 60 * 1000));
  const bucket30min = Math.floor(nowMs / (30 * 60 * 1000));
  const hash = hashString(`patient:${patientKey}`);

  // ~35% of patients online at any given moment
  const online = (hash + bucket5min * 17) % 100 < 35;

  // Offline: 1 min .. 7 days (10080 min) — stable within a 30-min window
  const lastSeenMinutesAgo = online
    ? 0
    : (((hash >>> 5) + bucket30min * 23) % 10080) + 1;

  return { online, lastSeenMinutesAgo };
}

export function formatPatientLastSeen(minutes: number): string {
  if (minutes <= 0) return "Active now";
  if (minutes < 60) return `Active ${minutes} min ago`;
  const h = Math.floor(minutes / 60);
  if (h < 24) return `Active ${h}h ago`;
  const d = Math.floor(h / 24);
  return `Active ${d}d ago`;
}
