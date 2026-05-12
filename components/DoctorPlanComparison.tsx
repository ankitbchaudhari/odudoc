"use client";

import { SUBSCRIPTION_PLANS } from "@/lib/doctor-subscriptions";

interface Props {
  selectedPlan?: "free" | "premium";
  onSelect?: (plan: "free" | "premium") => void;
  showCta?: boolean;
  ctaHrefFree?: string;
  ctaHrefPremium?: string;
}

export default function DoctorPlanComparison({
  selectedPlan,
  onSelect,
  showCta = true,
  ctaHrefFree = "/for-doctors/register?plan=free",
  ctaHrefPremium = "/for-doctors/register?plan=premium",
}: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {SUBSCRIPTION_PLANS.map((plan) => {
        const isPremium = plan.id === "premium";
        const selected = selectedPlan === plan.id;
        return (
          <div
            key={plan.id}
            onClick={onSelect ? () => onSelect(plan.id) : undefined}
            className={`relative rounded-2xl border-2 bg-white dark:bg-slate-900 p-8 shadow-sm transition-all ${
              onSelect ? "cursor-pointer hover:shadow-lg" : ""
            } ${
              selected
                ? "border-primary-600 ring-4 ring-primary-100"
                : isPremium
                  ? "border-primary-200"
                  : "border-gray-200 dark:border-slate-800"
            }`}
          >
            {isPremium && (
              <span className="absolute -top-3 right-6 rounded-full bg-primary-600 px-3 py-1 text-xs font-semibold text-white">
                MOST POPULAR
              </span>
            )}
            <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{plan.name}</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-5xl font-bold text-gray-900 dark:text-slate-100">
                ${plan.price}
              </span>
              <span className="text-gray-500 dark:text-slate-400">/month</span>
            </div>
            <p className="mt-3 text-sm text-gray-600 dark:text-slate-300">
              {isPremium
                ? "For doctors ready to scale their practice"
                : "Perfect for getting started"}
            </p>

            <div className="mt-6 rounded-lg bg-gray-50 dark:bg-slate-900 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                Consultations
              </div>
              <div className="mt-1 text-lg font-bold text-gray-900 dark:text-slate-100">
                {plan.consultationsLimit === null
                  ? "Unlimited"
                  : `Up to ${plan.consultationsLimit}/month`}
              </div>
              <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                Fee Range
              </div>
              <div className="mt-1 text-lg font-bold text-gray-900 dark:text-slate-100">
                ${plan.feeRangeMin} - ${plan.feeRangeMax}
              </div>
            </div>

            <ul className="mt-6 space-y-3">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-700 dark:text-slate-300">
                  <svg
                    className={`mt-0.5 h-5 w-5 flex-shrink-0 ${isPremium ? "text-primary-600" : "text-green-500"}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            {showCta && !onSelect && (
              <a
                href={isPremium ? ctaHrefPremium : ctaHrefFree}
                className={`mt-8 block w-full rounded-lg py-3 text-center text-sm font-semibold transition-colors ${
                  isPremium
                    ? "bg-primary-600 text-white hover:bg-primary-700"
                    : "border-2 border-primary-600 text-primary-600 hover:bg-primary-50"
                }`}
              >
                {isPremium ? "Go Premium" : "Start Free"}
              </a>
            )}

            {onSelect && selected && (
              <div className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-primary-50 py-2 text-sm font-semibold text-primary-700">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Selected
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
