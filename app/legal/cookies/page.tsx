import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie settings",
  description: "How OduDoc uses cookies, and how to manage your preferences.",
  alternates: { canonical: "/legal/cookies" },
};

export default function CookieSettingsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-extrabold text-gray-900 dark:text-slate-100">Cookie settings</h1>
      <p className="mt-3 text-lg text-gray-600 dark:text-slate-300">
        We use cookies for sign-in, security, and product analytics. You can adjust which categories are active.
      </p>

      <div className="mt-10 space-y-4">
        <CookieBlock
          title="Strictly necessary"
          required
          body="Session, auth, CSRF protection, language preference, dark-mode preference. The site does not function without these."
        />
        <CookieBlock
          title="Functional"
          body="Active family-profile selection, last-viewed dependent, search history, cart contents. Can be disabled at the cost of having to re-enter these each visit."
        />
        <CookieBlock
          title="Analytics"
          body="PostHog autocapture for product analytics — pageviews, clicks, conversion events. Visitor IDs are anonymous unless you sign in."
        />
        <CookieBlock
          title="Marketing"
          body="Disabled by default. Reserved for future ad-attribution. We do not currently set marketing cookies."
        />
      </div>

      <p className="mt-10 rounded-2xl bg-gray-50 p-6 text-sm text-gray-600 dark:bg-slate-900 dark:text-slate-300">
        To change preferences, clear the <code>od_consent</code> cookie and the consent banner will reappear on next visit.
        For data-subject requests (export / delete / restrict), see our{" "}
        <a className="text-emerald-600 hover:underline" href="/privacy">Privacy Policy</a>.
      </p>
    </main>
  );
}

function CookieBlock({ title, body, required = false }: { title: string; body: string; required?: boolean }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">{title}</h2>
        {required ? (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">Always on</span>
        ) : (
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-slate-800 dark:text-slate-300">Toggle via banner</span>
        )}
      </div>
      <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">{body}</p>
    </div>
  );
}
