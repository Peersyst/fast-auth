/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next.js 16 blocks cross-origin requests to /_next/* dev resources by
  // default. When testing on a phone over the LAN (e.g. http://192.168.1.31:3000),
  // the JS bundles get blocked and React never hydrates — every onClick
  // appears broken on mobile while CSS-only animations still work. Allow the
  // local-network host so the dev server serves its JS to mobile browsers.
  allowedDevOrigins: ["192.168.1.31"],
};

module.exports = nextConfig;
