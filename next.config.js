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
    ];
  },
};
module.exports = nextConfig;
