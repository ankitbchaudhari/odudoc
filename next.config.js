/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // Older demo-credentials emails (sent before 2026-04-22) used
      // /auth/signin; the real sign-in page lives at /auth/login.
      // Keep this redirect so those links don't 404 for prospects.
      { source: "/auth/signin", destination: "/auth/login", permanent: true },
    ];
  },
};
module.exports = nextConfig;
