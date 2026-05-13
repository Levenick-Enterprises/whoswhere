/** `tel:` URI for a phone number. Browsers strip non-digit characters themselves
 * when dialing, so we pass through the raw stored value. */
export function telHref(phone: string): string {
  return `tel:${phone}`;
}

/** Universal Google Maps search URL — opens Apple Maps on iOS via the system
 * URL handoff, Google Maps elsewhere. Works on both desktop and mobile. */
export function mapsHref(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
