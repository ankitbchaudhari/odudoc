"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { WithdrawalRequest } from "@/lib/withdrawals-store";
import type { DoctorEarning } from "@/lib/doctor-earnings-store";
import { useDoctorMoney } from "@/components/useDoctorMoney";

const STATUS_STYLES: Record<WithdrawalRequest["status"], string> = {
  pending: "bg-yellow-50 text-yellow-700",
  approved: "bg-blue-50 text-blue-700",
  rejected: "bg-red-50 text-red-700",
  paid: "bg-green-50 text-green-700",
};

const METHOD_LABELS: Record<WithdrawalRequest["method"], string> = {
  bank_transfer: "Bank Transfer",
  paypal: "PayPal",
  stripe: "Stripe",
  other: "Other",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DoctorEarningsPage() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [earnings, setEarnings] = useState<DoctorEarning[]>([]);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [periods, setPeriods] = useState({ today: 0, week: 0, month: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  // Doctor's display currency + USD→target FX. India doctors see ₹,
  // US doctors see $, etc. Stored amounts (USD) get converted at
  // render time only.
  const money = useDoctorMoney();

  const loadAll = async () => {
    setLoading(true);
    try {
      const [wRes, eRes] = await Promise.all([
        fetch("/api/withdrawals"),
        fetch("/api/doctor-earnings"),
      ]);
      if (wRes.ok) {
        const data = await wRes.json();
        setWithdrawals(data.withdrawals || []);
      }
      if (eRes.ok) {
        const data = await eRes.json();
        setEarnings(data.earnings || []);
        setPendingBalance(data.pendingBalance || 0);
        setPeriods(data.periods || { today: 0, week: 0, month: 0 });
      }
    } finally {
      setLoading(false);
    }
  };

  // Keep the original name alive as an alias so the withdrawal-success
  // callback still refreshes the ledger along with the withdrawals list.
  const loadWithdrawals = loadAll;

  useEffect(() => {
    loadAll();
  }, []);

  const AVAILABLE_BALANCE = pendingBalance;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/dashboard/doctor"
            className="rounded-lg p-2 text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:bg-slate-800 hover:text-gray-600 dark:text-slate-300"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Earnings</h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-slate-400">
              Your consultation revenue and payouts
            </p>
          </div>
        </div>

        {/* Balance + withdraw CTA */}
        <div className="mb-6 overflow-hidden rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 p-6 text-white shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-primary-100">
                Available Balance
              </p>
              <p className="mt-1 text-4xl font-bold">
                {money.format(AVAILABLE_BALANCE)}
              </p>
              <p className="mt-1 text-xs text-primary-100">
                Payouts are reviewed by admin and paid within 1-2 working days.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              disabled={AVAILABLE_BALANCE <= 0}
              className="rounded-lg bg-white dark:bg-slate-900 px-5 py-3 text-sm font-semibold text-primary-700 shadow transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-60"
              title={AVAILABLE_BALANCE <= 0 ? "No balance available yet" : undefined}
            >
              Request Withdrawal
            </button>
          </div>
        </div>

        {/* Period summaries */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Today", value: money.format(periods.today) },
            { label: "This Week", value: money.format(periods.week) },
            { label: "This Month", value: money.format(periods.month) },
          ].map((x) => (
            <div key={x.label} className="rounded-xl bg-white dark:bg-slate-900 p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400">{x.label}</p>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-slate-100">{x.value}</p>
            </div>
          ))}
        </div>

        {/* Recent earnings */}
        <div className="mb-6 rounded-xl bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-slate-100">Recent consultations</h2>
          {earnings.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400 dark:text-slate-500">
              No paid consultations yet. Earnings appear here as patients complete payment.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 pr-4">Patient</th>
                    <th className="pb-3 pr-4">Gross</th>
                    <th className="pb-3 pr-4">Commission</th>
                    <th className="pb-3 pr-4">Net</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {earnings.slice(0, 20).map((e) => (
                    <tr key={e.id}>
                      <td className="py-3 pr-4 text-xs text-gray-500 dark:text-slate-400">
                        {formatDate(e.createdAt)}
                      </td>
                      <td className="py-3 pr-4 text-gray-700 dark:text-slate-300">{e.patientName}</td>
                      <td className="py-3 pr-4 text-gray-900 dark:text-slate-100">
                        {money.formatFrom(e.grossAmount, e.currency)}
                      </td>
                      <td className="py-3 pr-4 text-gray-500 dark:text-slate-400">
                        −{money.formatFrom(e.commissionAmount, e.currency)}
                      </td>
                      <td className="py-3 pr-4 font-semibold text-gray-900 dark:text-slate-100">
                        {money.formatFrom(e.netAmount, e.currency)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                            e.status === "paid"
                              ? "bg-green-50 text-green-700"
                              : "bg-yellow-50 text-yellow-700"
                          }`}
                        >
                          {e.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Withdrawal history */}
        <div className="rounded-xl bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              Withdrawal Requests
            </h2>
            <button
              onClick={loadWithdrawals}
              className="text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="py-10 text-center text-sm text-gray-400 dark:text-slate-500">Loading…</p>
          ) : withdrawals.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400 dark:text-slate-500">
              You haven&apos;t requested any withdrawals yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    <th className="pb-3 pr-4">Requested</th>
                    <th className="pb-3 pr-4">Amount</th>
                    <th className="pb-3 pr-4">Method</th>
                    <th className="pb-3 pr-4">Details</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {withdrawals.map((w) => (
                    <tr key={w.id}>
                      <td className="py-3 pr-4 text-xs text-gray-500 dark:text-slate-400">
                        {formatDate(w.requestedAt)}
                      </td>
                      <td className="py-3 pr-4 font-semibold text-gray-900 dark:text-slate-100">
                        {money.format(w.amount)}
                      </td>
                      <td className="py-3 pr-4 text-gray-700 dark:text-slate-300">
                        {METHOD_LABELS[w.method]}
                      </td>
                      <td className="py-3 pr-4 text-gray-500 dark:text-slate-400">
                        {w.accountDetails}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[w.status]}`}
                        >
                          {w.status}
                        </span>
                        {w.adminNote && (
                          <p className="mt-1 text-[11px] text-gray-400 dark:text-slate-500">
                            Note: {w.adminNote}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <WithdrawalModal
          balance={AVAILABLE_BALANCE}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            loadWithdrawals();
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Modal                                                             */
/* ------------------------------------------------------------------ */

function WithdrawalModal({
  balance,
  onClose,
  onSuccess,
}: {
  balance: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<WithdrawalRequest["method"]>("bank_transfer");
  const [accountDetails, setAccountDetails] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (balance > 0 && n > balance) {
      setError(`You can withdraw up to $${balance.toFixed(2)}.`);
      return;
    }
    if (!accountDetails.trim()) {
      setError("Account details are required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: n,
          method,
          accountDetails: accountDetails.trim(),
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Request failed");
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Request Withdrawal</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:bg-slate-800"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 rounded-lg bg-primary-50 p-3 text-xs text-primary-800">
          Withdrawals are reviewed by our team. Funds usually arrive within
          <strong> 1-2 working days</strong> once approved.
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-300">
              Amount (USD)
            </label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className="w-full rounded-lg border border-gray-200 dark:border-slate-800 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-300">
              Payout Method
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as WithdrawalRequest["method"])}
              className="w-full rounded-lg border border-gray-200 dark:border-slate-800 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="bank_transfer">Bank Transfer</option>
              <option value="paypal">PayPal</option>
              <option value="stripe">Stripe</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-300">
              Account Details
            </label>
            <input
              value={accountDetails}
              onChange={(e) => setAccountDetails(e.target.value)}
              placeholder={
                method === "paypal"
                  ? "paypal@email.com"
                  : method === "bank_transfer"
                    ? "Bank name, account number, IFSC/SWIFT"
                    : "Payment reference"
              }
              required
              className="w-full rounded-lg border border-gray-200 dark:border-slate-800 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-300">
              Notes <span className="text-gray-400 dark:text-slate-500">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-200 dark:border-slate-800 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 dark:border-slate-800 py-2.5 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:bg-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex-1 !py-2.5 !text-sm disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
