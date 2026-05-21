// V14 + login-overhaul — /login full-page 3-door selector.
//
// Replaces the modal-centric flow. The Navbar "Log in" button still
// works (open new conversations from any session), but this is the
// canonical entry point per the V13 §x login spec:
//   - Patient → /login/patient (phone-or-email + 6-digit OTP)
//   - Doctor  → /login/doctor (email + password, with 2FA optional)
//   - Corporate → /login/corporate (staff ID or work email + password)
//
// On role detection after sign-in, NextAuth's redirect callback +
// /auth/login fallback route the user to /dashboard (patient) or
// /pro/dashboard (clinical / corporate roles).

import Link from "next/link";
import Logo from "@/components/Logo";

export const metadata = {
  title: "Log in — OduDoc",
  description: "Sign in to OduDoc. Patient, doctor, or organisation.",
};

const DOORS = [
  {
    href: "/login/patient",
    title: "Patient",
    sub: "Book appointments, manage health records, order medicines.",
    accent: "from-[#0F6E56] to-[#1D9E75]",
    border: "border-[#0F6E56]/30 hover:border-[#0F6E56]",
    btn: "bg-[#0F6E56] hover:bg-[#0A5942]",
    icon: "🧑",
  },
  {
    href: "/login/doctor",
    title: "Doctor",
    sub: "Telemedicine, prescriptions, OPD, earnings dashboard.",
    accent: "from-[#042C53] to-[#1E40AF]",
    border: "border-[#1E40AF]/30 hover:border-[#1E40AF]",
    btn: "bg-[#1E40AF] hover:bg-[#0A1F3B]",
    icon: "🩺",
    badge: "Also for hospital staff on OduDoc Pro",
  },
  {
    href: "/login/corporate",
    title: "Corporate",
    sub: "Hospitals, labs, pharmacies, pharma, insurance + more.",
    accent: "from-[#C9A84C] to-[#854D0E]",
    border: "border-[#C9A84C]/40 hover:border-[#C9A84C]",
    btn: "bg-[#854D0E] hover:bg-[#5C3209]",
    icon: "🏢",
  },
];

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Top bar — matches signup chrome */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Logo size="sm" />
          <Link href="/signup" className="text-sm font-semibold text-[#0F6E56] hover:underline">
            Sign up →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#0F6E56]">Welcome back</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">Log in to OduDoc</h1>
        <p className="mt-2 text-sm text-gray-600">Pick the account type you signed up with.</p>

        <div className="mt-8 space-y-3">
          {DOORS.map((d) => (
            <div key={d.href}>
              {d.badge && (
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  {d.badge}
                </p>
              )}
              <Link
                href={d.href}
                className={`group flex items-center gap-4 rounded-2xl border-2 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${d.border}`}
              >
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${d.accent} text-2xl shadow-md`}>
                  {d.icon}
                </span>
                <div className="flex-1">
                  <p className="text-base font-bold text-gray-900">{d.title}</p>
                  <p className="mt-0.5 text-xs text-gray-600">{d.sub}</p>
                </div>
                <span className={`rounded-lg px-4 py-2 text-xs font-semibold text-white shadow ${d.btn}`}>
                  Log in →
                </span>
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-gray-600">
          No account yet?{" "}
          <Link href="/signup" className="font-semibold text-[#0F6E56] hover:underline">
            Get started free →
          </Link>
        </p>
      </main>
    </div>
  );
}
