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

interface NewVendorForm {
  name: string;
  ownerName: string;
  ownerEmail: string;
  phone: string;
  addressLine: string;
  city: string;
  country: string;
  licenseNumber: string;
  licenseDocUrl: string;
  bankAccount: string;
  commissionPercent: string;
  autoApprove: boolean;
}

const EMPTY_NEW_VENDOR: NewVendorForm = {
  name: "",
  ownerName: "",
  ownerEmail: "",
  phone: "",
  addressLine: "",
  city: "",
  country: "",
  licenseNumber: "",
  licenseDocUrl: "",
  bankAccount: "",
  commissionPercent: "10",
  autoApprove: true,
};

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [form, setForm] = useState<NewVendorForm>(EMPTY_NEW_VENDOR);

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

  const submitNewVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAdding(true);
    try {
      const commissionNum = Number(form.commissionPercent);
      const payload = {
        name: form.name,
        ownerName: form.ownerName,
        ownerEmail: form.ownerEmail,
        phone: form.phone,
        addressLine: form.addressLine,
        city: form.city,
        country: form.country,
        licenseNumber: form.licenseNumber,
        licenseDocUrl: form.licenseDocUrl || undefined,
        bankAccount: form.bankAccount || undefined,
        commissionPercent: Number.isFinite(commissionNum) ? commissionNum : undefined,
        autoApprove: form.autoApprove,
      };
      const res = await fetch("/api/admin/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAddError(data.error || `Could not create vendor (HTTP ${res.status})`);
        return;
      }
      setShowAdd(false);
      setForm(EMPTY_NEW_VENDOR);
      // If they auto-approved, flip the filter so the new row is visible.
      if (form.autoApprove && filter !== "All" && filter !== "approved") {
        setFilter("approved");
      } else {
        await load();
      }
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vendor applications</h1>
            <p className="mt-1 text-sm text-gray-500">Approve or reject pharmacy signups for the multivendor shop.</p>
          </div>
          <button
            onClick={() => {
              setAddError(null);
              setForm(EMPTY_NEW_VENDOR);
              setShowAdd(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary-600 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-transform hover:scale-105"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add vendor
          </button>
        </div>

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

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={submitNewVendor}
            className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Add vendor</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Manually onboard a pharmacy. They&apos;ll get a vendor record immediately.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {addError && (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                {addError}
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Business / pharmacy name *" value={form.name}
                onChange={(v) => setForm({ ...form, name: v })} />
              <Field label="Owner full name *" value={form.ownerName}
                onChange={(v) => setForm({ ...form, ownerName: v })} />
              <Field label="Owner email *" type="email" value={form.ownerEmail}
                onChange={(v) => setForm({ ...form, ownerEmail: v })} />
              <Field label="Phone *" value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })} />
              <Field label="Address line *" value={form.addressLine} span={2}
                onChange={(v) => setForm({ ...form, addressLine: v })} />
              <Field label="City *" value={form.city}
                onChange={(v) => setForm({ ...form, city: v })} />
              <Field label="Country *" value={form.country}
                onChange={(v) => setForm({ ...form, country: v })} />
              <Field label="License number *" value={form.licenseNumber}
                onChange={(v) => setForm({ ...form, licenseNumber: v })} />
              <Field label="Commission % (0–100)" value={form.commissionPercent}
                onChange={(v) => setForm({ ...form, commissionPercent: v })} />
              <Field label="License doc URL (optional)" value={form.licenseDocUrl} span={2}
                onChange={(v) => setForm({ ...form, licenseDocUrl: v })} />
              <Field label="Bank account (optional)" value={form.bankAccount} span={2}
                onChange={(v) => setForm({ ...form, bankAccount: v })} />
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.autoApprove}
                onChange={(e) => setForm({ ...form, autoApprove: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Approve immediately (skip the pending stage)
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adding}
                className="rounded-xl bg-gradient-to-r from-primary-600 to-teal-600 px-5 py-2 text-sm font-semibold text-white shadow-md hover:scale-105 disabled:opacity-50"
              >
                {adding ? "Saving…" : "Create vendor"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  span = 1,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  span?: 1 | 2;
}) {
  return (
    <label className={`block text-sm ${span === 2 ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
      />
    </label>
  );
}
