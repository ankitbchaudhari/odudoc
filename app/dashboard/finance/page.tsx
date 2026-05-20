"use client";

// Financial Account — V8 §7.3 / V10 §1.6 of the Master Spec.
//
// Every entity (patient / doctor / hospital / pharmacy / lab / insurer
// / pharma / manufacturer) has the same Financial Account screen,
// reachable from their dashboard. This is the patient/doctor-facing
// version; admin views live in the Super Admin panel.

import { useEffect, useState } from "react";
import DashboardShell from "@/components/ui/DashboardShell";
import GlassCard from "@/components/ui/GlassCard";
import { useSession } from "next-auth/react";

interface Wallet {
  id: string;
  entityKind: string;
  balanceCents: number;
  holdCents: number;
  currency: string;
  status: "active" | "frozen" | "closed";
  updatedAt: string;
}
interface WalletTx {
  id: string;
  kind: string;
  amountCents: number;
  currency: string;
  fromWalletId: string | null;
  toWalletId: string | null;
  note?: string;
  refKind?: string;
  refId?: string;
  createdAt: string;
}

const KIND_LABEL: Record<string, string> = {
  consultation_fee:      "Consultation fee",
  consultation_refund:   "Consultation refund",
  settlement:            "Settlement",
  platform_fee:          "Platform fee",
  gov_tax:               "Government tax",
  gratitude_credit:      "Gratitude credit",
  gratitude_debit:       "Gratitude spent",
  insurance_payout:      "Insurance payout",
  insurance_premium:     "Insurance premium",
  ppme_fee:              "Pre-policy exam fee",
  equipment_purchase:    "Equipment purchase",
  equipment_refund:      "Equipment refund",
  warranty_repair:       "Warranty repair credit",
  topup:                 "Top-up",
  withdraw:              "Withdrawal",
  adjustment:            "Manual adjustment",
  course_purchase:       "Course purchase",
  import_export_fee:     "Import/export fee",
};

function fmtCents(cents: number, currency: string): string {
  const sign = cents < 0 ? "−" : "";
  const symbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : `${currency} `;
  return `${sign}${symbol}${(Math.abs(cents) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function FinanceDashboard() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role || "patient";
  const dashboardRole: "patient" | "doctor" | "corporate" =
    role === "doctor" ? "doctor"
    : role === "admin" || role === "staff" || role === "hr" || role === "support" ? "corporate"
    : "patient";

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [txns, setTxns] = useState<WalletTx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/wallet/me", { cache: "no-store" });
        if (r.ok) {
          const d = await r.json();
          if (!cancelled) {
            setWallet(d.wallet);
            setTxns(d.transactions || []);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <DashboardShell role={dashboardRole}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-[#0F6E56] to-[#1D9E75] bg-clip-text text-transparent">
            Financial account
          </span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-white/70">
          Every transaction — consultation fees, refunds, settlements,
          gratitude credits, top-ups — lives on one immutable ledger.
          Filter, export, audit.
        </p>
      </div>

      {loading ? (
        <GlassCard>
          <div className="flex items-center justify-center py-16">
            <svg className="h-8 w-8 animate-spin text-[#1D9E75]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        </GlassCard>
      ) : !wallet ? (
        <GlassCard><p className="text-white/70">Wallet not yet provisioned.</p></GlassCard>
      ) : (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <BalanceCard
              label="Available"
              value={fmtCents(wallet.balanceCents - wallet.holdCents, wallet.currency)}
              tone="emerald"
            />
            <BalanceCard
              label="On hold"
              value={fmtCents(wallet.holdCents, wallet.currency)}
              tone="amber"
              sub="Pledged for in-flight orders"
            />
            <BalanceCard
              label="Total balance"
              value={fmtCents(wallet.balanceCents, wallet.currency)}
              tone="navy"
              sub={`Status: ${wallet.status}`}
            />
          </div>

          <GlassCard>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-white/60">
              Recent transactions
            </h3>
            {txns.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/60">
                No transactions yet. Your account ledger will populate as
                consultations, settlements, or top-ups happen.
              </p>
            ) : (
              <ul className="divide-y divide-white/5">
                {txns.map((t) => {
                  const incoming = t.toWalletId === wallet.id;
                  return (
                    <li key={t.id} className="flex items-center justify-between py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                          {KIND_LABEL[t.kind] || t.kind}
                        </p>
                        <p className="text-xs text-white/60">
                          {new Date(t.createdAt).toLocaleString()}
                          {t.refKind && t.refId ? ` · ${t.refKind} #${t.refId.slice(-6)}` : ""}
                          {t.note ? ` · ${t.note}` : ""}
                        </p>
                      </div>
                      <span
                        className={
                          incoming
                            ? "shrink-0 text-sm font-bold text-emerald-300"
                            : "shrink-0 text-sm font-bold text-rose-300"
                        }
                      >
                        {incoming ? "+" : "−"}
                        {fmtCents(t.amountCents, t.currency)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </GlassCard>
        </>
      )}
    </DashboardShell>
  );
}

function BalanceCard({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: string;
  tone: "emerald" | "amber" | "navy";
  sub?: string;
}) {
  const grad =
    tone === "emerald" ? "from-[#0F6E56] to-[#1D9E75]"
    : tone === "amber" ? "from-[#C9A84C] to-[#854D0E]"
    : "from-[#042C53] to-[#1E40AF]";
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${grad} opacity-25 blur-2xl`} />
      <p className="text-xs font-bold uppercase tracking-wider text-white/60">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-white/50">{sub}</p>}
    </div>
  );
}
