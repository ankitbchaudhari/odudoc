// Client-side store for doctor → doctor patient referrals.
// Persisted in localStorage under `odudoc:referrals` so the demo works
// without a backend. Swap for fetch calls to /api/referrals when you
// wire up real persistence.

"use client";

import { useCallback, useEffect, useState } from "react";

export type ReferralStatus = "pending" | "accepted" | "declined" | "completed";

export interface Referral {
  id: string;
  // Patient
  patientEmail: string;
  patientName: string;
  patientPhone?: string;
  // Referring doctor
  fromDoctorId: string;
  fromDoctorName: string;
  fromDoctorEmail: string;
  fromSpecialty: string;
  // Receiving doctor
  toDoctorId: string;
  toDoctorName: string;
  toSpecialty: string;
  // Context
  reason: string;
  clinicalNotes: string;
  urgency: "routine" | "urgent" | "emergency";
  sourceConsultationId?: string;
  status: ReferralStatus;
  createdAt: string;
  updatedAt: string;
}

const KEY = "odudoc:referrals";
const EVENT = "odudoc:referrals:changed";

function read(): Referral[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Referral[]) : [];
  } catch {
    return [];
  }
}

function write(list: Referral[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* quota / privacy mode */
  }
}

export function createReferral(
  input: Omit<Referral, "id" | "status" | "createdAt" | "updatedAt">
): Referral {
  const now = new Date().toISOString();
  const ref: Referral = {
    ...input,
    id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
  write([ref, ...read()]);
  return ref;
}

export function updateReferralStatus(id: string, status: ReferralStatus) {
  const now = new Date().toISOString();
  const next = read().map((r) =>
    r.id === id ? { ...r, status, updatedAt: now } : r
  );
  write(next);
}

export function useReferrals() {
  const [items, setItems] = useState<Referral[]>([]);

  useEffect(() => {
    setItems(read());
    const refresh = () => setItems(read());
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const add = useCallback(
    (input: Omit<Referral, "id" | "status" | "createdAt" | "updatedAt">) => {
      const ref = createReferral(input);
      setItems(read());
      return ref;
    },
    []
  );

  const setStatus = useCallback((id: string, status: ReferralStatus) => {
    updateReferralStatus(id, status);
    setItems(read());
  }, []);

  return { items, add, setStatus };
}

export function urgencyStyle(u: Referral["urgency"]) {
  switch (u) {
    case "emergency":
      return "bg-red-100 text-red-700";
    case "urgent":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export function statusStyle(s: ReferralStatus) {
  switch (s) {
    case "pending":
      return "bg-amber-100 text-amber-700";
    case "accepted":
      return "bg-blue-100 text-blue-700";
    case "declined":
      return "bg-rose-100 text-rose-700";
    case "completed":
      return "bg-emerald-100 text-emerald-700";
  }
}
