import type { Metadata } from "next";
import Link from "next/link";
import { GoogleQuickLink } from "@/components/GoogleAuthButton";

export const metadata: Metadata = {
  title: "Get started on OduDoc",
  description: "Pick how you'll use OduDoc — as a patient, a doctor, or an organisation. Free to start.",
  alternates: { canonical: "/signup" },
};

// Spec v6.3 Section 57.3 / Cowork_Complete Section 5.2 calls for a
// unified signup wizard with 5 paths + OTP step. We're shipping a
// lightweight gateway today: pick your path → route into the existing
// /auth/register flow with path pre-filled. The full multi-step OTP
// wizard is tracked as a dedicated future build.

const PATHS = [
  {
    slug: "patient",
    emoji: "🧑",
    title: "I'm a patient",
    body: "Book consultations, manage your record, order medicines, sync wearables. Always free.",
    gradient: "from-emerald-400 to-teal-600",
    cta: "Get started — free",
    href: "/signup/start?path=patient",
  },
  {
    slug: "doctor",
    emoji: "🩺",
    title: "I'm a doctor",
    body: "Independent practice on OduDoc — telemedicine, AI prescription, earnings. Verification in 24–48h.",
    gradient: "from-violet-500 to-fuchsia-600",
    cta: "Apply as a doctor",
    href: "/signup/start?path=doctor",
  },
  {
    slug: "corporate",
    emoji: "🏢",
    title: "I'm an organisation",
    body: "Hospital, clinic, lab, pharmacy, pharma, insurance, education — pick your tenant type next.",
    gradient: "from-amber-400 to-rose-500",
    cta: "Pick organisation type →",
    href: "/signup/corporate",
  },
];

export default function SignupGatewayPage() {
  return (
    <main className="bg-gradient-to-br from-slate-50 via-white to-indigo-50 py-16 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">Get started</p>
          <h1 className="mt-2 text-4xl font-extrabold text-gray-900 dark:text-slate-100 md:text-5xl">
            How will you use OduDoc?
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-gray-600 dark:text-slate-300">
            Pick the path that fits you. You can always change scope later — patient accounts can become doctor accounts after credentialing. The full Google sign-up option appears on the next step.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {PATHS.map((p) => (
            <Link
              key={p.slug}
              href={p.href}
              className="group relative flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-transparent hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
            >
              <div className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${p.gradient} opacity-25 blur-2xl transition-opacity group-hover:opacity-60`} />
              <span className={`relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${p.gradient} text-3xl shadow-lg`}>
                {p.emoji}
              </span>
              <h2 className="relative mt-5 text-xl font-bold text-gray-900 dark:text-slate-100">{p.title}</h2>
              <p className="relative mt-2 flex-1 text-sm text-gray-600 dark:text-slate-300">{p.body}</p>
              <span className={`relative mt-4 inline-flex items-center gap-1 self-start rounded-lg bg-gradient-to-r ${p.gradient} px-4 py-2 text-sm font-bold text-white shadow-md transition-transform group-hover:translate-x-0.5`}>
                {p.cta}
              </span>
            </Link>
          ))}
        </div>

        {/* Returning visitor whose Google email is already on file —
            tap to sign in directly without re-picking a path. The
            signIn callback in lib/auth.ts looks up their stored role
            and routes to the matching dashboard. */}
        <div className="mt-10 text-center">
          <GoogleQuickLink callbackUrl="/dashboard" />
        </div>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-slate-400">
          Already have an account?{" "}
          <Link href="/auth/login" className="font-semibold text-emerald-600 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
