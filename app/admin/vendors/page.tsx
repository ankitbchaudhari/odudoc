"use client";

import { useEffect, useState } from "react";

interface Vendor {
  id: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  phone: string;
  city: string;
  country: string;
  licenseNumber: string;
  licenseDocUrl?: string;
  commissionPercent: number;
  status: "pending" | "approved" | "suspended" | "rejected";
  statusReason?: string;
  createdAt: string;
}

const STATUS_FILTERS = ["All", "pending", "approved", "suspended", "rejected"] as const;

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>("pending");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch(`/api/vendors?status=${filter}`);
    const data = await res.json();
    if (res.ok) setVendors(data.vendors || []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);

  const act = async (id: string, status: Vendor["status"], reason?: string) => {
    setBusy(id);
    try {
      await fetch(`/api/vendors/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason }),
      });
      await load();
    } finally { setBusy(null); }
  };

  const editCommission = async (v: Vendor) => {
    const raw = prompt(
      `Platform commission % for ${v.name}\n(0 = vendor keeps everything, 100 = platform keeps everything)`,
      String(v.commissionPercent)
    );
    if (raw === null) return;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      alert("Enter a number between 0 and 100.");
      return;
    }
    setBusy(v.id);
    try {
      const res = await fetch(`/api/vendors/${v.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commissionPercent: n }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Could not update commission.");
      }
      await load();
    } finally { setBusy(null); }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold text-gray-900">Vendor applications</h1>
        <p className="mt-1 text-sm text-gray-500">Approve or reject pharmacy signups for the multivendor shop.</p>

        <div className="mt-5 mb-4 flex gap-2">
          {STATUS_FILTERS.map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                filter === s ? "bg-primary-600 text-white" : "bg-white text-gray-700 border border-gray-200"
              }`}>
              {s}
            </button>
          ))}
        </div>

        {vendors.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center text-gray-400 shadow-sm">No vendors in this view.</div>
        ) : (
          <div className="space-y-3">
            {vendors.map((v) => (
              <div key={v.id} className="rounded-xl bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-bold text-gray-900">{v.name}</p>
                    <p className="text-xs text-gray-500">Owner: {v.ownerName} · {v.ownerEmail}</p>
                    <p className="text-xs text-gray-500">{v.phone} · {v.city}, {v.country}</p>
                    <p className="mt-1 text-xs text-gray-600">
                      License #{v.licenseNumber} ·{" "}
                      <button
                        onClick={() => editCommission(v)}
                        className="font-semibold text-primary-700 underline decoration-dotted underline-offset-2 hover:text-primary-800"
                        title="Click to edit commission rate"
                      >
                        {v.commissionPercent}% commission
                      </button>
                      {v.licenseDocUrl ? (
                        <button
                          onClick={async () => {
                            const res = await fetch(`/api/vendors/${v.id}/license-url`);
                            const data = await res.json();
                            if (res.ok && data.url) window.open(data.url, "_blank", "noopener");
                            else alert(data.error || "Could not open license");
                          }}
                          className="ml-2 text-primary-600 hover:underline"
                        >
                          · View license doc
                        </button>
                      ) : (
                        <span className="ml-2 text-gray-400">· no doc uploaded</span>
                      )}
                    </p>
                    {v.statusReason && <p className="mt-1 text-xs text-rose-700">Note: {v.statusReason}</p>}
                  </div>
                  <div className="text-right">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                      v.status === "approved" ? "bg-green-50 text-green-700"
                        : v.status === "pending" ? "bg-amber-50 text-amber-700"
                        : "bg-rose-50 text-rose-700"
                    }`}>{v.status}</span>
                    <p className="mt-1 text-xs text-gray-400">Applied {new Date(v.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {v.status !== "approved" && (
                    <button disabled={busy === v.id} onClick={() => act(v.id, "approved")}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                      Approve
                    </button>
                  )}
                  {v.status !== "suspended" && v.status === "approved" && (
                    <button disabled={busy === v.id} onClick={() => act(v.id, "suspended", prompt("Reason for suspension?") || undefined)}
                      className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
                      Suspend
                    </button>
                  )}
                  {v.status !== "rejected" && v.status !== "approved" && (
                    <button disabled={busy === v.id} onClick={() => act(v.id, "rejected", prompt("Reason for rejection?") || undefined)}
                      className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
                      Reject
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
