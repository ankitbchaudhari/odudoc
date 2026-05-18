import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security & Compliance",
  description: "How OduDoc protects patient data — 12 defence layers, HIPAA-aligned, DPDP-compliant, audit-logged.",
  alternates: { canonical: "/security" },
};

// Spec: v6.2 Section 53 — "12 layers tied together". Each layer owns a
// specific failure mode. This page summarises that for the public site;
// the internal SOC2 / DPDP documentation lives elsewhere.
const layers = [
  { n: 1, title: "Network", body: "TLS 1.3 · TURN over TLS · IP allowlist for admin · WAF.", prevents: "Eavesdropping · MITM · admin endpoint discovery" },
  { n: 2, title: "Authentication", body: "OAuth + email-password · 2FA mandatory clinical and admin · biometric optional · session rotation.", prevents: "Credential theft · session hijacking" },
  { n: 3, title: "Database authorisation", body: "Row-level security per tenant_id and role.", prevents: "Cross-tenant data leak via SQL injection or app bug" },
  { n: 4, title: "API authorisation", body: "Policy layer on every endpoint · scope checks.", prevents: "Privilege escalation via API misuse" },
  { n: 5, title: "UI authorisation", body: "Role-gated rendering · feature-flag visibility.", prevents: "Accidental exposure of features outside permission scope" },
  { n: 6, title: "Encryption at rest", body: "Encrypted volumes · separate keys for biometric and KYC vaults · KMS-managed.", prevents: "Disk theft · backup leak" },
  { n: 7, title: "File scanning", body: "ClamAV on every upload · quarantine on suspicion.", prevents: "Malware delivery via documents" },
  { n: 8, title: "Integrity chain", body: "SHA-256 envelope hashes all PHI events · tamper-evident.", prevents: "Silent data tampering" },
  { n: 9, title: "Watermarking", body: "Dynamic per-viewer watermark on every PHI render · screenshot attribution.", prevents: "Untraceable leaked screenshots" },
  { n: 10, title: "Audit log", body: "9 append-only tables · immutable at the DB role level.", prevents: "Internal misuse going undetected" },
  { n: 11, title: "Anomaly detection", body: "ML on access patterns · flags unusual contact-view bursts · off-hour PHI access.", prevents: "Insider threats · compromised accounts" },
  { n: 12, title: "Break-glass", body: "Super admin PHI access requires reason + two-person approval + separate audit log · time-bounded.", prevents: "Super admin abuse" },
];

const compliance = [
  { label: "ABDM / ABHA", body: "Ayushman Bharat health-stack integrated. FHIR exchange." },
  { label: "IMC telemedicine", body: "Indian Medical Council guidelines enforced — license verification, scheduled-drug gating, cross-border patient rules." },
  { label: "HIPAA-aligned", body: "Audit log, role-based access, encryption at rest + in transit. BAAs available." },
  { label: "DPDP (India)", body: "Consent capture, deletion requests, data-fiduciary obligations." },
  { label: "GDPR (EU)", body: "Export / delete / restrict workflows for European patients." },
  { label: "NABH / JCI", body: "Hospital accreditation tracker for compliance teams." },
];

export default function SecurityPage() {
  return (
    <main>
      <section className="bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Security &amp; compliance</p>
          <h1 className="mt-2 text-4xl font-extrabold md:text-5xl">
            12 layers between an attacker and your patient&apos;s record
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/80">
            Defence-in-depth means every single layer has to fail before harm happens. Here&apos;s what we run.
          </p>
        </div>
      </section>

      <section className="bg-white py-16 dark:bg-slate-950">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">The 12 layers</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {layers.map((l) => (
              <div key={l.n} className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-sm font-bold text-white shadow-lg">
                    {l.n}
                  </span>
                  <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">{l.title}</h3>
                </div>
                <p className="mt-3 text-sm text-gray-600 dark:text-slate-300">{l.body}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Prevents: <span className="font-normal text-gray-500 dark:text-slate-400">{l.prevents}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-16 dark:bg-slate-900">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Regulatory compliance</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {compliance.map((c) => (
              <div key={c.label} className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-950">
                <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-300">{c.label}</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 dark:bg-slate-950">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Have a security question?</h2>
          <p className="mt-3 text-gray-600 dark:text-slate-300">
            Email{" "}
            <a className="text-emerald-600 hover:underline" href="mailto:security@odudoc.com">security@odudoc.com</a>{" "}
            — we run a coordinated-disclosure program and respond within 48 hours.
          </p>
        </div>
      </section>
    </main>
  );
}
