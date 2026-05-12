import Link from "next/link";

export const metadata = {
  title: "Delete your account | OduDoc",
  description:
    "How to permanently delete your OduDoc account and what happens to your data.",
};

export default function DeleteAccountPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-gray-800 dark:text-slate-200">
      <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-slate-100">
        Delete your OduDoc account
      </h1>
      <p className="mb-8 text-sm text-gray-500 dark:text-slate-400">
        This page describes how to request deletion of your account on
        OduDoc and what data is removed or retained.
      </p>

      <section className="mb-8 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-slate-100">
          From the mobile app (recommended)
        </h2>
        <ol className="list-inside list-decimal space-y-2 text-sm">
          <li>Open the OduDoc app and sign in.</li>
          <li>Tap the <strong>Profile</strong> tab.</li>
          <li>Tap <strong>Privacy &amp; security</strong>.</li>
          <li>
            Scroll to the bottom — under <em>Danger zone</em>, tap{" "}
            <strong>Delete account</strong>.
          </li>
          <li>Confirm. We email you within 24 hours to verify the request.</li>
        </ol>
      </section>

      <section className="mb-8 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-slate-100">From email</h2>
        <p className="text-sm">
          If you can&apos;t access the app, send a deletion request to{" "}
          <a
            href="mailto:privacy@odudoc.com?subject=Delete%20my%20OduDoc%20account"
            className="font-semibold text-cyan-700 underline"
          >
            privacy@odudoc.com
          </a>{" "}
          from the email address on your account. We respond within 48 hours.
        </p>
      </section>

      <section className="mb-8 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-slate-100">
          What gets deleted within 24 hours
        </h2>
        <ul className="list-inside list-disc space-y-2 text-sm">
          <li>Your profile (name, email, phone, date of birth, gender, blood group)</li>
          <li>Login credentials (password, OAuth links, session tokens)</li>
          <li>Saved payment methods and billing addresses</li>
          <li>Notification preferences and device tokens</li>
          <li>App activity history and analytics events tied to your account</li>
          <li>Uploaded profile photo</li>
          <li>Saved appointments and pharmacy/lab orders that haven&apos;t been fulfilled</li>
        </ul>
      </section>

      <section className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="mb-3 text-xl font-semibold text-amber-900">
          What we are required to retain (and for how long)
        </h2>
        <p className="mb-3 text-sm text-amber-900">
          As a regulated healthcare service we must keep certain records even
          after you delete your account. These records are stripped of direct
          identifiers where possible and stored under restricted access.
        </p>
        <ul className="list-inside list-disc space-y-2 text-sm text-amber-900">
          <li>
            <strong>Consultation records, prescriptions, and lab reports</strong> —
            7 years from the date of the consultation, per HIPAA / medical
            record retention rules.
          </li>
          <li>
            <strong>Financial transaction records</strong> — 7 years for tax,
            audit, and dispute resolution (Stripe also retains these
            independently).
          </li>
          <li>
            <strong>Logs of consent / agreement events</strong> (privacy policy
            acceptance, BAA signature for doctors) — 6 years.
          </li>
        </ul>
        <p className="mt-3 text-xs text-amber-800">
          Where retention isn&apos;t legally required, we delete promptly. Where it
          is required, we keep the minimum data needed and never use it to
          re-identify you.
        </p>
      </section>

      <section className="mb-8 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-slate-100">
          What happens to doctors who consulted with you
        </h2>
        <p className="text-sm">
          Your consulting doctors retain their copies of prescriptions and
          consultation notes for the legally required period (7 years).
          We notify you in writing if that retained information is requested
          by a regulator or court.
        </p>
      </section>

      <section className="mb-8 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-slate-100">
          Reactivation
        </h2>
        <p className="text-sm">
          For 30 days after submitting a deletion request you can email{" "}
          <a
            href="mailto:privacy@odudoc.com"
            className="font-semibold text-cyan-700 underline"
          >
            privacy@odudoc.com
          </a>{" "}
          to cancel and restore your account. After 30 days deletion is
          permanent and irreversible.
        </p>
      </section>

      <section className="mb-2 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-slate-100">Questions?</h2>
        <p className="text-sm">
          Read our full{" "}
          <Link
            href="/privacy"
            className="font-semibold text-cyan-700 underline"
          >
            Privacy Policy
          </Link>{" "}
          or contact us at{" "}
          <a
            href="mailto:privacy@odudoc.com"
            className="font-semibold text-cyan-700 underline"
          >
            privacy@odudoc.com
          </a>
          .
        </p>
      </section>

      <p className="mt-10 text-center text-xs text-gray-400 dark:text-slate-500">
        OduDoc — last updated April 2026
      </p>
    </main>
  );
}
