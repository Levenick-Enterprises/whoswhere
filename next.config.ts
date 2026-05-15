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
  // Expose git metadata to the bundle so the /more footer can render a
  // build label. Next.js's `env` block runs at compile time and inlines
  // these as string literals everywhere `process.env.NEXT_PUBLIC_BUILD_*`
  // appears — works regardless of whether the page is force-dynamic.
  // Vercel sets VERCEL_GIT_* natively on the dev project's git deploys;
  // deploy-prod.yml sets them explicitly for tenant CLI deploys.
  //
  // We extract the PR number from the commit message at build time rather
  // than shipping the whole subject to the client — keeps the bundle a
  // little smaller and avoids the future temptation to render the raw
  // commit message (which would be an XSS surface, since commit subjects
  // are untrusted text).
  env: {
    NEXT_PUBLIC_BUILD_SHA: process.env.VERCEL_GIT_COMMIT_SHA ?? "",
    NEXT_PUBLIC_BUILD_PR_NUM: process.env.VERCEL_GIT_COMMIT_MESSAGE?.match(/\(#(\d+)\)/)?.[1] ?? "",
  },
};

export default nextConfig;
