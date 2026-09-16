/**
 * Formats an amount as AUD, e.g. `AU$12.34` / `-AU$12.34`.
 * Every price shown in the portal is AUD-only today, but a bare `$` reads
 * as ambiguous (USD?) to patients, so the currency is always marked — in the
 * same "AU$" prefix style used on the treatments overview page.
 */
export function formatAud(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}AU$${Math.abs(value).toFixed(2)}`;
}
