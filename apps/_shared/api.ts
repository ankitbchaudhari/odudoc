// Thin fetch client used by both apps. Talks to the existing
// odudoc.com REST endpoints — no separate backend.
//
// Auth: we store the NextAuth session cookie in expo-secure-store on
// successful login (POST /api/auth/callback/credentials) and attach
// it to every subsequent call. Cookie-based auth works across native
// + the existing web sessions, so a user signed-in on the website
// stays signed-in in the app and vice versa (when same origin).

import * as SecureStore from "expo-secure-store";
import { API_BASE } from "./theme";

const COOKIE_KEY = "odudoc_session_cookie";

export async function getSessionCookie(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(COOKIE_KEY);
  } catch {
    return null;
  }
}

export async function setSessionCookie(c: string): Promise<void> {
  await SecureStore.setItemAsync(COOKIE_KEY, c);
}

export async function clearSessionCookie(): Promise<void> {
  await SecureStore.deleteItemAsync(COOKIE_KEY);
}

export interface ApiOpts<TBody> {
  method?: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  body?: TBody;
  /** Skip Authorization — used for public endpoints during onboarding. */
  anonymous?: boolean;
}

export async function api<TResp = unknown, TBody = unknown>(
  path: string,
  opts: ApiOpts<TBody> = {},
): Promise<{ ok: boolean; status: number; data: TResp | { error?: string } }> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json",
  };
  if (!opts.anonymous) {
    const c = await getSessionCookie();
    if (c) headers.cookie = c;
  }
  const r = await fetch(`${API_BASE}${path}`, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  // Persist Set-Cookie on successful login. NextAuth sets multiple
  // cookies; we naively store the whole header — production-grade
  // would parse the session token specifically.
  const setCookie = r.headers.get("set-cookie");
  if (setCookie && path.startsWith("/api/auth/")) {
    await setSessionCookie(setCookie);
  }
  let data: TResp | { error?: string };
  try {
    data = (await r.json()) as TResp;
  } catch {
    data = { error: "invalid_json" };
  }
  return { ok: r.ok, status: r.status, data };
}

// ── Convenience wrappers for the screens ───────────────────────────

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  fee: number;
  rating: number;
  reviewCount: number;
  city?: string;
  available?: boolean;
  instantAvailable?: boolean;
  photoUrl?: string;
}

export interface Consultation {
  id: string;
  patientName: string;
  doctorName: string;
  specialty: string;
  scheduledFor: string;
  timeSlot: string;
  dateLabel?: string;
  status: string;
  mode: "video" | "chat";
  fee: number;
}

export interface PrescriptionRecord {
  id: string;
  createdAt: string;
  data: {
    diagnosis?: string;
    doctorName?: string;
    medications: Array<{ name: string; dose?: string; freq?: string }>;
  };
}

export async function fetchDoctors(): Promise<Doctor[]> {
  const r = await api<{ doctors: Doctor[] }>("/api/doctors/public", { anonymous: true });
  return (r.data as { doctors?: Doctor[] }).doctors || [];
}

export async function fetchMyConsultations(): Promise<Consultation[]> {
  const r = await api<{ consultations: Consultation[] }>("/api/consultations");
  return (r.data as { consultations?: Consultation[] }).consultations || [];
}

export async function fetchMyPrescriptions(): Promise<PrescriptionRecord[]> {
  const r = await api<{ prescriptions: PrescriptionRecord[] }>("/api/prescriptions");
  return (r.data as { prescriptions?: PrescriptionRecord[] }).prescriptions || [];
}
