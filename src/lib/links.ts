/** `tel:` URI for a phone number, or `null` if the input has no characters
 * RFC 3966 considers dialable (digits, `+`, `-`, `*`, `#`, `(`, `)`, `.`).
 * Callers should suppress the link when this returns null so we don't render
 * a tappable element that opens the dialer with an empty number. */
export function telHref(phone: string): string | null {
  const normalized = phone.replace(/[^\d+\-*#().]/g, "");
  return normalized ? `tel:${normalized}` : null;
}

/** Universal Google Maps search URL — opens Apple Maps on iOS via the system
 * URL handoff, Google Maps elsewhere. Works on both desktop and mobile. */
export function mapsHref(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
