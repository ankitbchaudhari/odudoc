"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import type { Consultation } from "@/lib/consultations-store";
import PatientPresenceBadge, { PatientPresenceDot } from "@/components/PatientPresenceBadge";
import { getPatientPresence } from "@/lib/doctor-presence";

interface PatientSummary {
  email: string;
  name: string;
  phone: string;
  totalConsults: number;
  lastConsult?: string; // ISO
  lastComplaint?: string;
  firstSeen: string;
}

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

function timeAgo(iso?: string): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function DoctorPatientsPage() {
  const { status } = useSession();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [search, setSearch] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [nowTick, setNowTick] = useState(0);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/consultations")
      .then((r) => r.json())
      .then((d) => setConsultations(d.consultations || []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [status]);

  useEffect(() => {
    setNowTick(Date.now());
    const t = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const patients = useMemo<PatientSummary[]>(() => {
    const map = new Map<string, PatientSummary>();
    // Walk newest → oldest
    const sorted = [...consultations].sort(
      (a, b) => new Date(b.updatedAt || b.scheduledFor).getTime() - new Date(a.updatedAt || a.scheduledFor).getTime()
    );
    for (const c of sorted) {
      if (!c.patientEmail) continue;
      const existing = map.get(c.patientEmail);
      if (!existing) {
        map.set(c.patientEmail, {
          email: c.patientEmail,
          name: c.patientName || c.patientEmail,
          phone: c.patientPhone || "",
          totalConsults: 1,
          lastConsult: c.updatedAt || c.scheduledFor,
          lastComplaint: (c as Consultation & { chiefComplaint?: string }).chiefComplaint || undefined,
          firstSeen: c.updatedAt || c.scheduledFor,
        });
      } else {
        existing.totalConsults += 1;
        const t = new Date(c.updatedAt || c.scheduledFor).getTime();
        if (t < new Date(existing.firstSeen).getTime()) existing.firstSeen = c.updatedAt || c.scheduledFor;
      }
    }
    return Array.from(map.values());
  }, [consultations]);

  const filtered = useMemo(() => {
    let list = [...patients];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.phone.toLowerCase().includes(q)
      );
    }
    if (onlineOnly && nowTick) {
      list = list.filter((p) => getPatientPresence(p.email, nowTick).online);
    }
    // Sort: online first, then most recent consult
    list.sort((a, b) => {
      if (nowTick) {
        const ao = getPatientPresence(a.email, nowTick).online ? 1 : 0;
        const bo = getPatientPresence(b.email, nowTick).online ? 1 : 0;
        if (ao !== bo) return bo - ao;
      }
      return new Date(b.lastConsult || 0).getTime() - new Date(a.lastConsult || 0).getTime();
    });
    return list;
  }, [patients, search, onlineOnly, nowTick]);

  const onlineCount = useMemo(() => {
    if (!nowTick) return 0;
    return patients.filter((p) => getPatientPresence(p.email, nowTick).online).length;
  }, [patients, nowTick]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/doctor"
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Patients</h1>
              <p className="mt-0.5 text-sm text-gray-500">
                Everyone you&apos;ve consulted with, all in one place
              </p>
            </div>
          </div>
          {nowTick > 0 && patients.length > 0 && (
            <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              {onlineCount} active now
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Total patients" value={patients.length} />
          <Stat label="Active right now" value={onlineCount} color="text-green-700" />
          <Stat label="Consultations done" value={consultations.length} />
          <Stat label="Repeat patients" value={patients.filter((p) => p.totalConsults > 1).length} />
        </div>

        {patients.length > 0 && (
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or phone…"
              className="w-full max-w-md rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
            <button
              onClick={() => setOnlineOnly((v) => !v)}
              className={`inline-flex items-center gap-2 self-start rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                onlineOnly
                  ? "bg-green-600 text-white shadow-sm"
                  : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
              }`}
            >
              <span className={`inline-block h-2 w-2 rounded-full ${onlineOnly ? "bg-white" : "bg-green-500"}`} />
              Active only
            </button>
          </div>
        )}

        {!loaded ? (
          <div className="flex justify-center py-16">
            <svg className="h-6 w-6 animate-spin text-primary-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : patients.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900">No patients yet</h2>
            <p className="mt-1 text-sm text-gray-500">
              Patients will appear here after you complete your first consultation.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
            No patients match your filters.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <div key={p.email} className="flex gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-bold text-white">
                    {initialsOf(p.name) || "?"}
                  </div>
                  <PatientPresenceDot patientKey={p.email} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-gray-900">{p.name}</p>
                    <span className="shrink-0 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-semibold text-primary-700">
                      {p.totalConsults}×
                    </span>
                  </div>
                  <p className="truncate text-xs text-gray-500">{p.email}</p>
                  <div className="mt-2">
                    <PatientPresenceBadge patientKey={p.email} />
                  </div>
                  {p.lastComplaint && (
                    <p className="mt-2 line-clamp-1 text-xs text-gray-500">
                      <span className="font-medium text-gray-400">Last:</span> {p.lastComplaint}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-gray-400">
                    Last consult {timeAgo(p.lastConsult)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color = "text-gray-900" }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
