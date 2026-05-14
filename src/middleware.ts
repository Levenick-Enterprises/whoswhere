import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware-helpers";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Exclude all `/_next/` paths (HMR, flight, static, image, etc.) so dev
  // hot-reload doesn't get auth-gated when signed out — plus the obvious
  // static asset extensions and favicon.
  matcher: ["/((?!_next/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
