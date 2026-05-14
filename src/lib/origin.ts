import "server-only";

import { headers } from "next/headers";

const LOCAL_HOST_RE = /^(localhost(:\d+)?|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

/**
 * Returns the client-facing origin (proto + host) for the current request,
 * derived from request headers rather than the underlying TCP connection.
 *
 * Necessary for Cloudflare Tunnel and any reverse-proxy setup where the
 * actual server-side connection is HTTP-to-localhost but the public URL is
 * `https://<public-host>`. Reading `request.url` in that environment yields
 * `http://localhost:3000/...`, which causes user-facing redirects to point
 * back at the dev machine — unreachable from any other device.
 *
 * Trusted headers: `x-forwarded-host` (set by proxies) falls back to `host`.
 * We don't trust `x-forwarded-proto` because Cloudflared sends `http` for
 * the internal leg even when the client used HTTPS; instead we infer the
 * scheme from the host shape (RFC1918 / localhost → http, everything else
 * → https).
 */
export async function publicOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) throw new Error("Cannot determine request origin (no host header).");
  const proto = LOCAL_HOST_RE.test(host) ? "http" : "https";
  return `${proto}://${host}`;
}

/**
 * Coerces an untrusted `next` redirect parameter into a safe internal path.
 * Anything not starting with a single `/` (or starting with `//`, which is
 * a protocol-relative URL) falls back to `/jobsites`. Prevents open-redirect
 * attacks where `?next=https://evil` would bounce the user off-site after
 * sign-in.
 */
export function safeNext(raw: string | null | undefined, fallback = "/jobsites"): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//")) return fallback;
  return raw;
}
