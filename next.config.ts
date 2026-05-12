import type { NextConfig } from "next";

// Next 16 blocks cross-origin dev resources (HMR, chunks) by default.
// When a developer wants to open the dev server from their phone on the
// same WiFi, the phone's request origin (e.g. http://192.168.4.34:3000)
// is cross-origin from the dev server's perspective. Pass DEV_LAN_ORIGINS
// in .env.local as a comma-separated list of LAN hostnames to allowlist.
// Production deploys serve everything same-origin so this is dev-only.
const devOrigins =
  process.env.DEV_LAN_ORIGINS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? [];

const nextConfig: NextConfig = {
  ...(devOrigins.length > 0 ? { allowedDevOrigins: devOrigins } : {}),
};

export default nextConfig;
