/**
 * Formats an amount as BDT (Bangladeshi Taka), e.g. `BDT 12.34` / `-BDT 12.34`.
 * Based on Medusa currency configuration with currency code 'bdt'.
 */
export function formatBdt(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}BDT ${Math.abs(value).toFixed(2)}`;
}

// Aliases for compatibility across the codebase
export const formatCurrency = formatBdt;
export const formatAud = formatBdt;

