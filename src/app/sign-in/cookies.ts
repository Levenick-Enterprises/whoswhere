export const SIGNIN_EMAIL_COOKIE = "signin_email";
export const SIGNIN_SENT_AT_COOKIE = "signin_sent_at";
export const SIGNIN_COOKIE_MAX_AGE = 60 * 5; // 5 minutes

// Cooldown between magic-link sends. Enforced two ways:
//   - Client side: the ResendButton countdown gives visible feedback.
//   - Server side: requestSignInCodeAction reads SIGNIN_SENT_AT_COOKIE on
//     entry and skips the Supabase send if within this window, preserving
//     the no-enumeration property (response shape stays identical).
export const RESEND_COOLDOWN_SECONDS = 30;
