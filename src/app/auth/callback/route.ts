import { NextResponse, type NextRequest } from "next/server";

import { publicOrigin, safeNext } from "@/lib/origin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Magic-link landing route. Supabase redirects here with a `code` query param;
 * we exchange it for a session cookie and bounce to the originally-requested
 * path (or /projects by default). Redirect targets are built from the public
 * origin (headers), not request.url — behind a reverse proxy like Cloudflare
 * Tunnel the latter resolves to http://localhost:3000.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  const origin = await publicOrigin();

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL("/sign-in?error=callback", origin));
}
