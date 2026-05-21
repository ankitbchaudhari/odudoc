"use client";

// V6 §5 cross-connection map — admin visibility view.

import { useEffect, useState } from "react";

interface Connection { event: string; handlerCount: number }

// V6 maps each connection to a section label. Mirror it in the UI so
// the audit view groups cleanly.
const SECTION_LABEL: Record<string, string> = {
  "patient.registered":          "§5.2 Patient registration",
  "staff.account.created":       "§5.3 Staff onboarding",
  "department.created":          "§5.4 Department",
  "ward_bed.created":            "§5.5 Ward / bed",
  "appointment.booked":          "§5.6 Appointment",
  "consultation.completed":      "§5.7 Consultation",
  "ipd.admission.opened":        "§5.8 IPD admission",
  "ipd.discharge.completed":     "§5.9 Discharge",
  "lab.result.entered":          "§5.10 Lab result",
  "blood.cross_match.issued":    "§5.11 Blood cross-match",
  "purchase_order.created":      "§5.12 PO / supply chain",
  "staff.leave.approved":        "§5.13 Staff leave",
  "incident.reported":           "§5.14 Incident",
  "asset.created":               "§5.15 Asset",
  "qms.metric.captured":         "§5.16 QMS metric",
  "insurance.claim.submitted":   "§5.17 Claim submitted",
  "insurance.claim.paid":        "§5.18 Claim paid",
  "wallet.transfer.completed":   "§5.19 Wallet transfer",
  "ppme.submitted":              "§5.20 PPME submit",
  "equipment.ordered":           "§5.21 Equipment order",
  "course.enrolled":             "§5.22 Course enrol",
  "course.completed":            "§5.23 Course complete",
  "near_miss.reported":          "§5.24 Near-miss",
  "car.opened":                  "§5.25 CAR opened",
  "empanelment.approved":        "§5.26 Empanelment",
  "pre_auth.approved":           "§5.27 Pre-auth",
  "drug_master.updated":         "§5.28 Drug master",
};

export default function CrossConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/cross-connections", { cache: "no-store" });
      if (r.ok) setConnections((await r.json()).connections || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cross-connection map</h1>
        <p className="mt-1 text-sm text-gray-600">
          V6 §5 — 28 trigger flows. Every action that fans out downstream
          side-effects is registered here. Click an event to see what fires.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-center text-sm text-gray-500">Loading…</p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">V6 section</th>
                <th className="px-4 py-2 text-left">Event</th>
                <th className="px-4 py-2 text-right">Handlers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {connections.map((c, i) => (
                <tr key={c.event} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}>
                  <td className="px-4 py-2 text-gray-400 font-mono">{i + 1}</td>
                  <td className="px-4 py-2 font-medium text-gray-900">{SECTION_LABEL[c.event] || c.event}</td>
                  <td className="px-4 py-2"><code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{c.event}</code></td>
                  <td className="px-4 py-2 text-right">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${c.handlerCount > 0 ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-500"}`}>
                      {c.handlerCount}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-700">
        <h2 className="font-bold text-gray-900">How to add a new connection</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs">
          <li>Add the event name to <code>CrossConnection</code> type in <code>lib/cross-connections.ts</code>.</li>
          <li>Add handlers to the <code>HANDLERS</code> map for that event.</li>
          <li>At the call site that should fire, import <code>emit</code> and call it.</li>
          <li>The event appears here automatically.</li>
        </ol>
      </div>
    </div>
  );
}
