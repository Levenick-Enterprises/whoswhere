import { z } from "zod";

import { normalizeEmail } from "@/lib/normalizeEmail";

// Basic email shape check — same regex shape as scripts/tenants.ts. We're
// not validating deliverability (signInWithOtp will do that downstream); we
// just want to reject obvious typos before they hit the DB CHECK constraint.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const appUserRoleSchema = z.enum(["admin", "audit"]);
export type AppUserRole = z.infer<typeof appUserRoleSchema>;

// transform runs normalizeEmail BEFORE the length/regex checks, so they
// validate the canonical form — same shape projectInputSchema uses on name.
// app_users_email_canonical CHECK constraint in the DB enforces the same
// invariant; this schema is the friendly-error frontline.
export const appUserInputSchema = z.object({
  email: z
    .string()
    .transform((s) => normalizeEmail(s))
    .pipe(
      z
        .string()
        .min(1, "Email is required")
        .max(254, "Email is too long")
        .regex(EMAIL_RE, "Doesn't look like a valid email address"),
    ),
  role: appUserRoleSchema,
});

export type AppUserInput = z.infer<typeof appUserInputSchema>;
