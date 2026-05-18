/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // Older demo-credentials emails (sent before 2026-04-22) used
      // /auth/signin; the real sign-in page lives at /auth/login.
      // Keep this redirect so those links don't 404 for prospects.
      { source: "/auth/signin", destination: "/auth/login", permanent: true },

      // Admin notifications historically linked to /admin/doctors/{id}
      // — but no detail page exists. Send those clicks to the verifications
      // queue (where most of those notifications originate). The id is
      // dropped because the verifications page already groups by doctor.
      // Notifications created from 2026-05-07 onward use the correct
      // destination directly; this catches old rows in app_kv.
      {
        source: "/admin/doctors/:id(d-[A-Za-z0-9-]+)",
        destination: "/admin/doctors/verifications",
        permanent: false,
      },

      // Spec URL aliases. v6.0 §2 / Final Cowork Reference §A1 want
      // role-encoded dashboard URLs (/dashboard/user, /dashboard/corp/*).
      // The filesystem stays at /dashboard, /dashboard/doctor, /admin —
      // these redirects let the spec URLs work as aliases without
      // moving 150+ admin routes. Forward-compatible: when we do
      // migrate the filesystem later, these aliases already exist
      // and old links keep working.
      { source: "/dashboard/user/:path*", destination: "/dashboard/:path*", permanent: false },
      { source: "/dashboard/user", destination: "/dashboard", permanent: false },
      { source: "/dashboard/corp/doctor/:path*", destination: "/dashboard/doctor/:path*", permanent: false },
      { source: "/dashboard/corp/doctor", destination: "/dashboard/doctor", permanent: false },
      { source: "/dashboard/corp/admin/:path*", destination: "/admin/:path*", permanent: false },
      { source: "/dashboard/corp/admin", destination: "/admin", permanent: false },
      { source: "/dashboard/super/:path*", destination: "/admin/super/:path*", permanent: false },
      { source: "/dashboard/super", destination: "/admin/super", permanent: false },
    ];
  },
};
module.exports = nextConfig;
