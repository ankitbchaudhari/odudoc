"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Consultation } from "@/lib/consultations-store";

export default function PatientConsultationsPage() {
  const [list, setList] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/consultations");
      const data = await res.json();
      setList(data.consultations || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">My Consultations</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">Track your video consultations and prescriptions.</p>
          </div>
          <Link href="/consult/book" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
            + Book new
          </Link>
        </div>

        {loading ? (
          <div className="py-20 text-center text-gray-500 dark:text-slate-400">Loading…</div>
        ) : list.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-slate-900 p-12 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800 text-xl">🩺</div>
            <p className="mb-4 text-sm text-gray-500 dark:text-slate-400">No consultations yet.</p>
            <Link href="/consult/book" className="inline-block rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
              Book your first consultation
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((c) => (
              <Link key={c.id} href={`/dashboard/consultations/${c.id}`}
                className="block rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm ring-1 ring-gray-100 hover:ring-primary-200">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-slate-100">{c.doctorName}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{c.specialty} · {c.dateLabel} at {c.timeSlot}</p>
                  </div>
                  <StatusBadge status={c.status} />
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">${c.fee}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    awaiting_doctor: "bg-amber-100 text-amber-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    rescheduled: "bg-blue-100 text-blue-700",
    completed: "bg-emerald-100 text-emerald-700",
    refunded: "bg-rose-100 text-rose-700",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] || "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300"}`}>{status.replace(/_/g, " ")}</span>;
}
