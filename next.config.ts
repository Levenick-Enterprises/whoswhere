import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow LAN-origin requests to dev resources (HMR, chunks) so the dev
  // server can be hit from a phone on the same WiFi. Production deploys
  // serve everything same-origin, so this only matters locally.
  // CIDR isn't supported here — list explicit hostnames.
  allowedDevOrigins: ["192.168.4.34"],
};

export default nextConfig;
