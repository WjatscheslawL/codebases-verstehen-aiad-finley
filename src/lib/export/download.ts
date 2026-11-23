import { formatIsoDateLocal } from './format';

/**
 * Triggers a browser download for the given Blob.
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before releasing the URL
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Builds a file name like "finley-portfolio-2026-11-18.csv"
 */
export function buildExportFileName(extension: 'csv' | 'pdf', date: Date = new Date()): string {
  return `finley-portfolio-${formatIsoDateLocal(date)}.${extension}`;
}
