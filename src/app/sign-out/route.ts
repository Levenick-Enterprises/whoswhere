import { type NextRequest, NextResponse } from "next/server";

import { publicOrigin } from "@/lib/origin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Signs the foreman out. `SameSite=Lax` cookies already block the obvious
 * cross-site form-POST attack, but an iframe-embedded malicious page could
 * still induce a logout (annoyance, not data loss). The Origin check below
 * closes that vector: if Origin is set and doesn't match the public-facing
 * origin, refuse to act. We allow missing Origin since some legitimate
 * same-origin scenarios in older browsers omit it, and the realistic attack
 * vector always sends the header.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const expected = await publicOrigin();
  if (origin && origin !== expected) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/sign-in", expected), { status: 303 });
}
