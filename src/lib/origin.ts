import "server-only";

import { headers } from "next/headers";

const LOCAL_HOST_RE = /^(localhost(:\d+)?|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

/**
 * Returns the client-facing origin (proto + host) for the current request.
 *
 * Two paths:
 *
 *   1. **Env-pinned** (production): if `APP_ORIGIN` is set, return it as-is.
 *      Removes any dependency on possibly-spoofable proxy headers. Set this
 *      per-Vercel-project on the Production scope only — preview deployments
 *      get unique URLs that the header-inference path handles correctly.
 *
 *   2. **Header-inferred** (local dev, previews, anywhere `APP_ORIGIN` is
 *      unset): reads `x-forwarded-host` (set by proxies) falling back to
 *      `host`. Necessary for Cloudflare Tunnel and reverse-proxy setups
 *      where the actual server-side connection is HTTP-to-localhost but the
 *      public URL is `https://<public-host>`. Scheme is inferred from the
 *      host shape (RFC1918 / localhost → http, everything else → https);
 *      we don't trust `x-forwarded-proto` because Cloudflared sends `http`
 *      for the internal leg even when the client used HTTPS.
 */
export async function publicOrigin(): Promise<string> {
  const pinned = process.env.APP_ORIGIN;
  // Strip any trailing slashes — an operator typo like
  // `APP_ORIGIN=https://demo.whos-where.com/` would otherwise silently break
  // the Origin check on /sign-out (browser's Origin header never has a
  // trailing slash → mismatch → 403) AND produce malformed
  // `${origin}/auth/callback` URLs that won't match the Supabase Redirect
  // URL allowlist.
  if (pinned) return pinned.replace(/\/+$/, "");

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
