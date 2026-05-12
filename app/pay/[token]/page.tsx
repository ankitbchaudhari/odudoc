"use client";

// Patient-facing public invoice payment page. URL is /pay/[token]
// where token is the random publicToken on the invoice. No auth,
// no login — anyone with the link can view + pay. The clinic
// generates this link for the patient to share.

import { use, useCallback, useEffect, useState } from "react";

interface PublicInvoice {
  number: string;
  issueDate: string;
  dueDate?: string;
  lineItems: Array<{ description: string; quantity: number; unitPrice: number }>;
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  total: number;
  currency: string;
  status: "draft" | "sent" | "paid" | "void";
  notes?: string;
  paidAt?: string;
}

export default function PublicPayPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [invoice, setInvoice] = useState<PublicInvoice | null>(null);
  const [patientName, setPatientName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [paying, setPaying] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/invoices/${token}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not load invoice");
      }
      const data = await res.json();
      setInvoice(data.invoice);
      setPatientName(data.patientName || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  // Handle Stripe redirect.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const paid = params.get("paid");
    const canceled = params.get("canceled");
    if (paid === "1" && sessionId) {
      (async () => {
        try {
          const res = await fetch(
            `/api/public/invoices/${token}/confirm?session_id=${encodeURIComponent(sessionId)}`
          );
          if (res.ok) {
            const data = await res.json();
            setConfirmation(
              `Thank you — payment received. Invoice ${data.invoice?.number || ""} is now paid.`
            );
            load();
          } else {
            const data = await res.json().catch(() => ({}));
            setConfirmation(data.error || "Payment is processing — refresh in a moment.");
          }
        } catch {
          setConfirmation("Payment is processing — refresh in a moment.");
        } finally {
          window.history.replaceState({}, "", `/pay/${token}`);
        }
      })();
    } else if (canceled === "1") {
      setConfirmation("Payment cancelled. You can try again whenever you're ready.");
      window.history.replaceState({}, "", `/pay/${token}`);
    }
  }, [token, load]);

  async function startPayment() {
    setPaying(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/invoices/${token}/pay`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Could not start payment");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-pulse text-slate-400">Loading invoice…</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <div className="rounded-3xl bg-white dark:bg-slate-900 p-8 text-center shadow">
          <p className="text-sm text-slate-700 dark:text-slate-300">{error || "Invoice not found."}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            If you got this link by mistake, please contact your clinic.
          </p>
        </div>
      </div>
    );
  }

  const isPaid = invoice.status === "paid";

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 py-10">
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute -top-40 left-1/2 h-[420px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-200/40 via-violet-200/40 to-fuchsia-200/40 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl px-4">
        <div className="mb-5 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
            OduDoc · Secure invoice payment
          </p>
          <h1 className="mt-1 bg-gradient-to-r from-slate-900 via-indigo-900 to-fuchsia-900 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
            Invoice {invoice.number}
          </h1>
        </div>

        {confirmation && (
          <div
            className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${
              confirmation.includes("Thank you")
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
            {confirmation}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/85 shadow-xl shadow-indigo-500/5 backdrop-blur-xl">
          {isPaid && (
            <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-3 text-sm font-semibold text-emerald-800">
              ✓ Paid {invoice.paidAt ? `on ${invoice.paidAt.slice(0, 10)}` : ""}
            </div>
          )}
          <div className="px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Bill to
                </p>
                <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-slate-100">
                  {patientName || "Patient"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Issued
                </p>
                <p className="mt-0.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                  {invoice.issueDate}
                </p>
                {invoice.dueDate && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Due {invoice.dueDate}</p>
                )}
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    <th className="px-4 py-2">Description</th>
                    <th className="px-2 py-2 text-center">Qty</th>
                    <th className="px-2 py-2 text-right">Unit</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {invoice.lineItems.map((li, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2.5 text-slate-800 dark:text-slate-200">{li.description}</td>
                      <td className="px-2 py-2.5 text-center tabular-nums text-slate-700 dark:text-slate-300">
                        {li.quantity}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-300">
                        {invoice.currency} {li.unitPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-medium text-slate-900 dark:text-slate-100">
                        {invoice.currency} {(li.quantity * li.unitPrice).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 ml-auto w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Subtotal</span>
                <span className="tabular-nums">
                  {invoice.currency} {invoice.subtotal.toFixed(2)}
                </span>
              </div>
              {invoice.taxAmount ? (
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span>Tax{invoice.taxRate ? ` (${invoice.taxRate}%)` : ""}</span>
                  <span className="tabular-nums">
                    {invoice.currency} {invoice.taxAmount.toFixed(2)}
                  </span>
                </div>
              ) : null}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-1.5 flex items-center justify-between text-base font-bold text-slate-900 dark:text-slate-100">
                <span>Total</span>
                <span className="tabular-nums">
                  {invoice.currency} {invoice.total.toFixed(2)}
                </span>
              </div>
            </div>

            {invoice.notes && (
              <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-xs text-slate-700 dark:text-slate-300">
                <p className="mb-0.5 font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Note
                </p>
                {invoice.notes}
              </div>
            )}
          </div>

          {!isPaid && (
            <div className="border-t border-slate-100 bg-slate-50/40 px-6 py-5">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Email for receipt (optional)
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                />
              </label>
              <button
                onClick={startPayment}
                disabled={paying}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-xl disabled:opacity-50"
              >
                {paying ? (
                  "Opening secure payment…"
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    Pay {invoice.currency} {invoice.total.toFixed(2)} securely
                  </>
                )}
              </button>
              <p className="mt-3 text-center text-[11px] text-slate-500 dark:text-slate-400">
                Payments are processed by Stripe. Your card details never touch our servers.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
