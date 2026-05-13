/** `tel:` URI for a phone number. RFC 3966 only allows digits, `+`, `-`, `*`,
 * `#`, `(`, `)`, and `.` in the path — strip anything else (most commonly
 * whitespace from input like "(555) 123 4567") to keep the URL valid across
 * browsers. The dialer itself is forgiving once the URI parses. */
export function telHref(phone: string): string {
  const normalized = phone.replace(/[^\d+\-*#().]/g, "");
  return `tel:${normalized}`;
}

/** Universal Google Maps search URL — opens Apple Maps on iOS via the system
 * URL handoff, Google Maps elsewhere. Works on both desktop and mobile. */
export function mapsHref(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
