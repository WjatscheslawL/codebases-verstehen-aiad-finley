/**
 * Formatting helpers shared by the CSV and PDF exports (German locale, Euro).
 */

const currencyFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const currencyFormatterNoCents = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0
});

const percentFormatter = new Intl.NumberFormat('de-DE', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const compactFormatter = new Intl.NumberFormat('de-DE', {
  notation: 'compact',
  maximumFractionDigits: 1
});

/** "1.234,56 €" – large values (≥ 100.000 €) without cents to stay compact */
export function formatEuro(value: number): string {
  return Math.abs(value) >= 100_000
    ? currencyFormatterNoCents.format(value)
    : currencyFormatter.format(value);
}

/** "12,34 %" for a ratio like 0.1234 */
export function formatPercent(ratio: number): string {
  return percentFormatter.format(ratio);
}

/** Short axis labels: "5.000 €", "200.000 €", "1,5 Mio. €", "0,05 €", "10^-6 €" */
export function formatEuroCompact(value: number): string {
  if (value >= 1_000_000) {
    return `${compactFormatter.format(value)} €`;
  }
  if (value >= 1) {
    return `${value.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €`;
  }
  if (value >= 0.01) {
    return `${value.toLocaleString('de-DE', { maximumSignificantDigits: 2 })} €`;
  }
  // Very small values (portfolios close to total loss): power-of-ten notation
  const exponent = Math.round(Math.log10(value));
  const mantissa = value / Math.pow(10, exponent);
  const prefix = Math.abs(mantissa - 1) < 0.01 ? '' : `${mantissa.toLocaleString('de-DE', { maximumFractionDigits: 1 })} · `;
  return `${prefix}10^${exponent} €`;
}

/** Decimal number with comma separator and exactly two decimals, no grouping: "1234,56" */
export function formatDecimalDe(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

/** "2026-11-18" in local time (used for file names) */
export function formatIsoDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** "18.11.2026" */
export function formatGermanDate(date: Date): string {
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
