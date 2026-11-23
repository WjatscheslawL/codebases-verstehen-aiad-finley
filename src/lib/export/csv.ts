import { DataPoint } from '@/types';
import { downloadBlob, buildExportFileName } from './download';
import { formatDecimalDe } from './format';

/**
 * CSV layout tuned for German Excel / LibreOffice:
 * - semicolon as separator, comma as decimal mark
 * - UTF-8 byte order mark so umlauts are detected correctly
 * - CRLF line endings (RFC 4180)
 */
const SEPARATOR = ';';
const LINE_BREAK = '\r\n';
const UTF8_BOM = '\uFEFF';

/**
 * Builds the CSV content with one row per data point of the historical chart.
 * Exports the full monthly series (the chart itself only renders a downsampled version).
 */
export function buildPortfolioCsv(data: DataPoint[]): string {
  const header = ['Datum', 'Portfoliowert (EUR)'].join(SEPARATOR);
  const rows = data.map(point => [point.date, formatDecimalDe(point.value)].join(SEPARATOR));
  return UTF8_BOM + [header, ...rows].join(LINE_BREAK) + LINE_BREAK;
}

/**
 * Creates the CSV file and starts the download.
 */
export function exportPortfolioCsv(data: DataPoint[]): void {
  if (data.length === 0) {
    throw new Error('Keine Daten für den CSV-Export vorhanden.');
  }
  const csv = buildPortfolioCsv(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, buildExportFileName('csv'));
}
