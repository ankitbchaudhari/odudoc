"use client";

// Manual payout details — universal replacement for Stripe Connect.
// Doctor picks a payout method (bank wire / PayPal / Wise / UPI / other)
// and fills the relevant fields. Admin processes the payout off-platform.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ISO_COUNTRIES } from "@/lib/iso-countries";

type Method = "bank" | "paypal" | "wise" | "upi" | "other";

interface PayoutDetails {
  method: Method;
  accountHolder?: string;
  bankName?: string;
  accountNumber?: string;
  routingCode?: string;
  country?: string;
  currency?: string;
  paypalEmail?: string;
  upiId?: string;
  notes?: string;
  updatedAt?: string;
}

const CURRENCIES = [
  "USD", "EUR", "GBP", "INR", "AUD", "CAD", "AED", "SGD", "JPY", "CNY",
  "BRL", "MXN", "ZAR", "NGN", "KES", "GHS", "PHP", "IDR", "MYR", "THB",
  "VND", "TRY", "PKR", "BDT", "LKR", "EGP", "SAR", "QAR", "KWD", "OMR",
  "CHF", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON", "ILS", "NZD",
];

export default function DoctorPayoutPage() {
  const [details, setDetails] = useState<PayoutDetails>({ method: "bank" });
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/doctors/me/payout", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j?.payout) setDetails({ method: "bank", ...j.payout });
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const set = <K extends keyof PayoutDetails>(k: K, v: PayoutDetails[K]) =>
    setDetails((d) => ({ ...d, [k]: v }));

  const onSave = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/doctors/me/payout", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(details),
      });
      const j = await r.json();
      if (!r.ok) {
        setMsg({ kind: "err", text: j.error || "Save failed" });
      } else {
        setDetails((d) => ({ ...d, ...j.payout }));
        setMsg({ kind: "ok", text: "Payout details saved. Our finance team will use these for your next payout." });
      }
    } catch (err) {
      setMsg({ kind: "err", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const summary = useMemo(() => {
    if (!details) return "";
    if (details.method === "bank") {
      return [details.bankName, details.accountNumber ? `••••${details.accountNumber.slice(-4)}` : ""]
        .filter(Boolean)
        .join(" · ");
    }
    if (details.method === "paypal") return details.paypalEmail || "";
    if (details.method === "upi") return details.upiId || "";
    if (details.method === "wise") return details.paypalEmail || details.accountHolder || "";
    return details.notes || "";
  }, [details]);

  if (!loaded) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="h-32 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-6">
          <Link
            href="/dashboard/doctor"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to dashboard
          </Link>
        </div>

        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-6 text-white">
            <h1 className="text-2xl font-bold">Payout details</h1>
            <p className="mt-1 text-sm text-white/90">
              Tell us how you&apos;d like to be paid. Our finance team processes
              payouts manually after each consultation cycle — typically every
              7–14 days.
            </p>
            {/* Minimum payout notice — front and center so doctors
                aren't surprised when a small balance rolls forward. */}
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm ring-1 ring-white/30">
              <span aria-hidden="true">💰</span>
              Minimum payout: <span className="font-bold">USD 100</span>
              <span className="text-white/70">·</span>
              <span className="font-normal text-white/80">Balances under this amount roll over to the next cycle.</span>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {/* Method picker — beautiful tile selector */}
            <div className="mb-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Payout method
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(["bank", "paypal", "wise", "other"] as Method[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => set("method", m)}
                    className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                      details.method === m
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {labelFor(m)}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Don&apos;t see your method? Pick <b>Other</b> and describe it — we
                support local mobile money (M-Pesa, GCash), UPI, crypto wallets,
                and regional bank networks worldwide.
              </p>
            </div>

            {/* Method-specific fields */}
            {details.method === "bank" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Account holder name">
                  <input
                    className="input-modern"
                    value={details.accountHolder || ""}
                    onChange={(e) => set("accountHolder", e.target.value)}
                    placeholder="As it appears on your bank account"
                  />
                </Field>
                <Field label="Bank name">
                  <input
                    className="input-modern"
                    value={details.bankName || ""}
                    onChange={(e) => set("bankName", e.target.value)}
                    placeholder="Your bank's name"
                  />
                </Field>
                <Field label="Account number or IBAN">
                  <input
                    className="input-modern"
                    value={details.accountNumber || ""}
                    onChange={(e) => set("accountNumber", e.target.value)}
                    placeholder="Local account number, IBAN, or equivalent"
                  />
                </Field>
                <Field label="Bank routing code">
                  <input
                    className="input-modern"
                    value={details.routingCode || ""}
                    onChange={(e) => set("routingCode", e.target.value)}
                    placeholder="SWIFT/BIC, sort code, ABA, BSB, IFSC, CLABE…"
                  />
                </Field>
                <Field label="Bank country">
                  <select
                    className="input-modern"
                    value={details.country || ""}
                    onChange={(e) => set("country", e.target.value)}
                  >
                    <option value="">Select country…</option>
                    {ISO_COUNTRIES.map((c) => (
                      <option key={c.iso} value={c.iso}>{c.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Currency">
                  <select
                    className="input-modern"
                    value={details.currency || ""}
                    onChange={(e) => set("currency", e.target.value)}
                  >
                    <option value="">Select currency…</option>
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>
              </div>
            )}

            {details.method === "paypal" && (
              <Field label="PayPal email">
                <input
                  type="email"
                  className="input-modern"
                  value={details.paypalEmail || ""}
                  onChange={(e) => set("paypalEmail", e.target.value)}
                  placeholder="you@example.com"
                />
              </Field>
            )}

            {details.method === "wise" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Wise account email">
                  <input
                    type="email"
                    className="input-modern"
                    value={details.paypalEmail || ""}
                    onChange={(e) => set("paypalEmail", e.target.value)}
                    placeholder="email registered with Wise"
                  />
                </Field>
                <Field label="Account holder name">
                  <input
                    className="input-modern"
                    value={details.accountHolder || ""}
                    onChange={(e) => set("accountHolder", e.target.value)}
                    placeholder="Full name on the Wise account"
                  />
                </Field>
                <Field label="Currency">
                  <select
                    className="input-modern"
                    value={details.currency || ""}
                    onChange={(e) => set("currency", e.target.value)}
                  >
                    <option value="">Select currency…</option>
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>
              </div>
            )}

            {details.method === "upi" && (
              <Field label="UPI ID">
                <input
                  className="input-modern"
                  value={details.upiId || ""}
                  onChange={(e) => set("upiId", e.target.value)}
                  placeholder="yourname@bankname"
                />
              </Field>
            )}

            {details.method === "other" && (
              <Field label="Describe your preferred method">
                <textarea
                  className="input-modern"
                  rows={3}
                  value={details.notes || ""}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="e.g. Mobile money (M-Pesa), crypto wallet, cheque pickup"
                />
              </Field>
            )}

            {/* Optional notes for any method */}
            {details.method !== "other" && (
              <div className="mt-4">
                <Field label="Notes (optional)">
                  <textarea
                    className="input-modern"
                    rows={2}
                    value={details.notes || ""}
                    onChange={(e) => set("notes", e.target.value)}
                    placeholder="Any payout instructions, e.g. preferred day, transfer reference"
                  />
                </Field>
              </div>
            )}

            {/* Status */}
            {summary && (
              <div className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <span className="text-lg">✓</span>
                <div>
                  <p className="font-semibold">Saved on file</p>
                  <p className="text-xs text-emerald-700/80">{labelFor(details.method)} · {summary}</p>
                </div>
              </div>
            )}

            {msg && (
              <div
                className={`mt-4 rounded-xl px-4 py-3 text-sm ${
                  msg.kind === "ok"
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border border-rose-200 bg-rose-50 text-rose-800"
                }`}
              >
                {msg.text}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={onSave}
                disabled={busy}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
              >
                {busy ? "Saving…" : "Save payout details"}
              </button>
              <Link
                href="/dashboard/doctor"
                className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-6 px-2 text-center text-xs text-gray-500">
          Your payout details are stored securely and visible only to you and our finance team.
          We never share them with patients.
        </p>
      </div>

      <style jsx global>{`
        .input-modern {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border-radius: 0.75rem;
          border: 1px solid #e5e7eb;
          background: #fff;
          font-size: 0.875rem;
          transition: all 0.15s;
        }
        .input-modern:focus {
          outline: none;
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
        }
      `}</style>
    </div>
  );
}

function labelFor(m: Method): string {
  switch (m) {
    case "bank": return "Bank transfer";
    case "paypal": return "PayPal";
    case "wise": return "Wise";
    case "upi": return "UPI";
    case "other": return "Other";
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </span>
      {children}
    </label>
  );
}
