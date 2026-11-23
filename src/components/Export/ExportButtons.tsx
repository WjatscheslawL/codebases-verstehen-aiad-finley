import React, { useState } from 'react';
import { Asset, PortfolioHistory, PortfolioItem } from '@/types';
import { exportPortfolioCsv, exportPortfolioPdf } from '@/lib/export';

type ExportFormat = 'csv' | 'pdf';

interface ExportButtonsProps {
  assets: Asset[];
  portfolio: PortfolioItem[];
  history: PortfolioHistory | null;
}

const ERROR_MESSAGES: Record<ExportFormat, string> = {
  csv: 'CSV-Datei konnte nicht erstellt werden. Bitte erneut versuchen.',
  pdf: 'PDF-Bericht konnte nicht erstellt werden. Bitte erneut versuchen.'
};

/**
 * Waits until the browser has painted, so the loading state is visible
 * before the (synchronous) file generation blocks the main thread.
 */
const waitForPaint = () =>
  new Promise<void>(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));

const Spinner: React.FC = () => (
  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
    <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const DownloadIcon: React.FC = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" />
  </svg>
);

/**
 * Export buttons for the historical chart: CSV raw data and PDF summary report
 */
export const ExportButtons: React.FC<ExportButtonsProps> = ({ assets, portfolio, history }) => {
  const [activeExport, setActiveExport] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasData = history !== null && history.data.length > 0;
  const isBusy = activeExport !== null;

  const handleExport = async (format: ExportFormat) => {
    if (!history || isBusy) return;

    setActiveExport(format);
    setError(null);

    try {
      await waitForPaint();
      if (format === 'csv') {
        exportPortfolioCsv(history.data);
      } else {
        await exportPortfolioPdf({ assets, portfolio, history });
      }
    } catch (err) {
      console.error(`Export (${format}) failed:`, err);
      setError(ERROR_MESSAGES[format]);
    } finally {
      setActiveExport(null);
    }
  };

  const baseButton =
    'inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium transition-colors ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ' +
    'disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2" role="group" aria-label="Simulationsergebnisse exportieren">
        <button
          type="button"
          onClick={() => handleExport('csv')}
          disabled={!hasData || isBusy}
          aria-busy={activeExport === 'csv'}
          title="Alle Monatswerte als CSV-Datei herunterladen"
          className={`${baseButton} border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300`}
        >
          {activeExport === 'csv' ? <Spinner /> : <DownloadIcon />}
          {activeExport === 'csv' ? 'CSV wird erstellt…' : 'CSV herunterladen'}
        </button>

        <button
          type="button"
          onClick={() => handleExport('pdf')}
          disabled={!hasData || isBusy}
          aria-busy={activeExport === 'pdf'}
          title="Einseitigen Bericht mit Kennzahlen und Chart als PDF herunterladen"
          className={`${baseButton} bg-indigo-600 text-white hover:bg-indigo-700`}
        >
          {activeExport === 'pdf' ? <Spinner /> : <DownloadIcon />}
          {activeExport === 'pdf' ? 'PDF wird erstellt…' : 'PDF-Bericht herunterladen'}
        </button>
      </div>

      <span className="sr-only" aria-live="polite">
        {activeExport === 'csv' && 'CSV-Datei wird erstellt'}
        {activeExport === 'pdf' && 'PDF-Bericht wird erstellt'}
      </span>

      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};
