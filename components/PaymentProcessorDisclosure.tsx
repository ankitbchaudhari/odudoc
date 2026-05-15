// Renders the regulatory-mandated payment-processor disclosure that must
// appear next to every checkout button. Each processor (Razorpay,
// Cashfree, Stripe) requires merchants to link to their published terms
// and privacy policies so the cardholder knows whose contract they're
// entering when they pay. Reused under every PaymentForm / Cashfree
// button / Razorpay button.
//
// Usage:
//   <PaymentProcessorDisclosure processor="razorpay" />
//
// Pass "all" (default) when the checkout offers more than one provider —
// the user picks the gateway and the disclosure covers the lot.

import type { JSX } from "react";

type Processor = "razorpay" | "cashfree" | "stripe" | "all";

const LINKS: Record<Exclude<Processor, "all">, { label: string; terms: string; privacy: string }> = {
  razorpay: {
    label: "Razorpay",
    terms: "https://razorpay.com/terms",
    privacy: "https://razorpay.com/privacy",
  },
  cashfree: {
    label: "Cashfree",
    terms: "https://www.cashfree.com/policies/terms-and-conditions",
    privacy: "https://www.cashfree.com/policies/privacy-policy",
  },
  stripe: {
    label: "Stripe",
    terms: "https://stripe.com/legal/ssa",
    privacy: "https://stripe.com/privacy",
  },
};

function ProcessorLine({ p }: { p: keyof typeof LINKS }): JSX.Element {
  const l = LINKS[p];
  return (
    <span>
      <a href={l.terms} target="_blank" rel="noreferrer" className="underline hover:text-gray-700 dark:hover:text-slate-200">{l.label} Terms</a>
      {" · "}
      <a href={l.privacy} target="_blank" rel="noreferrer" className="underline hover:text-gray-700 dark:hover:text-slate-200">Privacy</a>
    </span>
  );
}

export default function PaymentProcessorDisclosure({
  processor = "all",
  className = "",
}: {
  processor?: Processor;
  className?: string;
}) {
  const set: (keyof typeof LINKS)[] = processor === "all"
    ? ["razorpay", "cashfree", "stripe"]
    : [processor];

  return (
    <p className={`mt-3 text-[11px] leading-relaxed text-gray-400 dark:text-slate-500 ${className}`}>
      Payments are processed by{" "}
      {set.map((p, i) => (
        <span key={p}>
          {i > 0 ? (i === set.length - 1 ? " or " : ", ") : ""}
          <ProcessorLine p={p} />
        </span>
      ))}
      . Your card details never touch our servers. By continuing you agree to the relevant processor&apos;s terms and privacy policy.
    </p>
  );
}
