"use client";

// One-page admin checklist for switching the Razorpay integration
// from test mode (rzp_test_...) to live mode (rzp_live_...). This is
// a manual operational step — we surface the full sequence here so
// whoever flips the switch can't miss a step.
//
// The page itself doesn't write to Razorpay or rotate keys (Razorpay's
// dashboard owns that). It just gates the rollout behind a clear
// checklist + sanity-check helpers (env probe via /api/payments-config,
// preview test-transaction link, copy-paste env names).

import { useEffect, useState } from "react";

interface Gateways {
  stripe: boolean;
  cashfree: boolean;
  razorpay: boolean;
}

export default function RazorpayGoLivePage() {
  const [gateways, setGateways] = useState<Gateways | null>(null);
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/payments-config", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setGateways(d.gateways || null))
      .catch(() => {});
    // Persist checklist state per-browser so refresh doesn't reset.
    try {
      const saved = localStorage.getItem("odudoc:razorpay_go_live");
      if (saved) setChecks(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const toggle = (key: string) => {
    setChecks((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem("odudoc:razorpay_go_live", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const steps: Step[] = [
    {
      id: "kyc",
      title: "Complete Razorpay KYC",
      body: "Submit all required documents on Razorpay dashboard → Account & Settings → KYC. Wait for ✅ Activated.",
      hint: "Without KYC, Razorpay won't issue live keys.",
    },
    {
      id: "test_txn",
      title: "Complete one test transaction",
      body: "Razorpay onboarding step 3 needs at least one successful test payment through your integration. Use Cashfree/UPI test methods if cards are restricted.",
      hint: "Try success@razorpay UPI or any Netbanking test bank.",
    },
    {
      id: "settlement",
      title: "Add settlement bank account",
      body: "Razorpay → Account & Settings → Banking & Settlements. Add the bank account where payouts should land. Verify via penny-test.",
      hint: "Without a verified bank account, payouts queue up but never pay out.",
    },
    {
      id: "webhook",
      title: "Configure Razorpay webhook (optional but recommended)",
      body: "Razorpay → Settings → Webhooks → Add new. URL: https://odudoc.com/api/payments/razorpay/webhook (not implemented yet — add it before flipping live for better reconciliation).",
      hint: "Without webhook, we still verify via the in-line verify endpoint, but webhooks are the source of truth for delayed-success cases.",
      optional: true,
    },
    {
      id: "live_keys",
      title: "Generate live API keys",
      body: "Razorpay → Account & Settings → API Keys → Generate Live Key. Copy the Key ID (rzp_live_...) and Key Secret immediately — the secret is shown only once.",
      hint: "Store the secret somewhere safe (1Password / Bitwarden). Vercel env vars are encrypted but you may need to re-enter it later.",
    },
    {
      id: "rotate_test",
      title: "Rotate the test keys you've shared in chat",
      body: "Any rzp_test_... keys you pasted into chats / docs / screenshots are public. Razorpay → API Keys → Regenerate Test Key. The old test keys become invalid.",
      hint: "Test keys can't move real money, but rotating is good hygiene.",
    },
    {
      id: "vercel_env",
      title: "Update Vercel env vars",
      body: "Vercel dashboard → odudoc → Settings → Environment Variables. Update RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the rzp_live_... values. Save to Production environment.",
      hint: "Don't add NEXT_PUBLIC_RAZORPAY_KEY_ID — the public key is surfaced via /api/payments/razorpay/create-order so rotating doesn't require a rebuild.",
    },
    {
      id: "redeploy",
      title: "Redeploy production",
      body: "Vercel → Deployments → click ⋯ on latest → Redeploy. Wait for build to go green.",
      hint: "Env var changes only take effect on a new deploy.",
    },
    {
      id: "verify_config",
      title: "Verify the live config",
      body: "Visit /api/payments-config in your browser. JSON should show gateways.razorpay = true. If false, the env vars didn't load.",
    },
    {
      id: "smoke_test",
      title: "Live smoke test — ₹1 to your own card",
      body: "Open the wallet top-up, pay ₹1 to your own bank card. It should debit ₹1 from your account and credit ₹1 + 5% bonus to the wallet. Check Razorpay dashboard → Payments → row appears.",
      hint: "Verify the payment appears with status 'captured' on Razorpay. Refund yourself afterwards via Razorpay dashboard → Payments → Refund.",
    },
    {
      id: "communicate",
      title: "Announce the change",
      body: "Tell stakeholders Razorpay is live. Update support runbooks. Anyone seeing 'test mode' banners should hard-refresh (Ctrl + Shift + R).",
      optional: true,
    },
  ];

  const allRequiredDone = steps.filter((s) => !s.optional).every((s) => checks[s.id]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">Admin · Operations</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-slate-100">Razorpay go-live checklist</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Walk through every step in order. Tick off as you complete each one.
          Progress is saved locally to this browser.
        </p>
      </header>

      {/* Current state probe */}
      <div className="mb-6 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100">Current state</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Live from /api/payments-config — refresh after redeploy.</p>
        <ul className="mt-3 flex flex-wrap gap-2 text-xs">
          {gateways ? (
            <>
              <Probe label="Stripe" on={gateways.stripe} />
              <Probe label="Cashfree" on={gateways.cashfree} />
              <Probe label="Razorpay" on={gateways.razorpay} />
            </>
          ) : (
            <li className="text-gray-500 dark:text-slate-400">Probing…</li>
          )}
        </ul>
      </div>

      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li
            key={s.id}
            className={`flex items-start gap-3 rounded-2xl border p-4 transition ${
              checks[s.id]
                ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20"
                : "border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            }`}
          >
            <input
              type="checkbox"
              checked={!!checks[s.id]}
              onChange={() => toggle(s.id)}
              className="mt-1 h-5 w-5 accent-emerald-500"
              aria-label={`Mark step ${i + 1} done`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                Step {i + 1}{s.optional && " · optional"}
              </p>
              <h3 className={`mt-0.5 text-base font-bold ${checks[s.id] ? "text-emerald-700 dark:text-emerald-300 line-through" : "text-gray-900 dark:text-slate-100"}`}>
                {s.title}
              </h3>
              <p className="mt-1 text-sm text-gray-700 dark:text-slate-300">{s.body}</p>
              {s.hint && <p className="mt-1 text-xs italic text-gray-500 dark:text-slate-400">{s.hint}</p>}
            </div>
          </li>
        ))}
      </ol>

      <div className={`mt-6 rounded-2xl p-5 text-center ${allRequiredDone ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200" : "bg-gray-50 dark:bg-slate-900 text-gray-600 dark:text-slate-400"}`}>
        {allRequiredDone ? (
          <p className="font-bold">🎉 Required steps complete — Razorpay should be live.</p>
        ) : (
          <p>Tick every required step above before announcing the go-live.</p>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-gray-400 dark:text-slate-500">
        Razorpay docs: <a href="https://razorpay.com/docs/payments/payments/go-live/" target="_blank" rel="noreferrer" className="hover:underline">razorpay.com/docs/payments/payments/go-live</a>
      </p>
    </main>
  );
}

interface Step {
  id: string;
  title: string;
  body: string;
  hint?: string;
  optional?: boolean;
}

function Probe({ label, on }: { label: string; on: boolean }) {
  return (
    <li className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold ${on ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400"}`}>
      <span>{on ? "✓" : "○"}</span>
      <span>{label}</span>
    </li>
  );
}
