/** `tel:` URI for a phone number, or `null` if the input has no characters
 * RFC 3966 considers dialable (digits, `+`, `-`, `*`, `#`, `(`, `)`, `.`).
 * Callers should suppress the link when this returns null so we don't render
 * a tappable element that opens the dialer with an empty number. */
export function telHref(phone: string): string | null {
  const normalized = phone.replace(/[^\d+\-*#().]/g, "");
  return normalized ? `tel:${normalized}` : null;
}

/** Apple Maps URL for an address. iOS routes this to the Apple Maps app
 * natively; on Android/desktop it lands on Apple's web fallback. */
export function appleMapsHref(address: string): string {
  return `https://maps.apple.com/?q=${encodeURIComponent(address)}`;
}

/** Google Maps universal search URL. iOS sends this straight to Google Maps
 * (app if installed, web otherwise); Android sends to the Google Maps app. */
export function googleMapsHref(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
