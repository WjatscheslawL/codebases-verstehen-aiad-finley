import type { jsPDF } from 'jspdf';
import { Asset, DataPoint, PortfolioHistory, PortfolioItem } from '@/types';
import { AssetCategory, getAssetCategory } from '@/constants/marketEvents';
import { GLOBAL_SEED } from '@/constants/assets';
import { downloadBlob, buildExportFileName } from './download';
import {
  formatEuro,
  formatEuroCompact,
  formatGermanDate,
  formatPercent
} from './format';

/**
 * Everything the one-page report needs
 */
export interface PortfolioReportInput {
  assets: Asset[];
  portfolio: PortfolioItem[];
  history: PortfolioHistory;
  createdAt?: Date;
}

// ---------------------------------------------------------------------------
// Layout & branding (matches the Tailwind colors used in the app)
// ---------------------------------------------------------------------------

type RGB = [number, number, number];

const COLORS: Record<string, RGB> = {
  blue600: [37, 99, 235],
  indigo600: [79, 70, 229],
  blue50: [239, 246, 255],
  blue100: [219, 234, 254],
  blue200: [191, 219, 254],
  white: [255, 255, 255],
  gray800: [31, 41, 55],
  gray500: [107, 114, 128],
  gray200: [229, 231, 235],
  gray100: [243, 244, 246],
  gray50: [249, 250, 251],
  green600: [22, 163, 74],
  red600: [220, 38, 38],
  orange600: [234, 88, 12]
};

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 15;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const FOOTER_Y = PAGE_HEIGHT - 10;

const CATEGORY_LABELS: Record<AssetCategory, string> = {
  'ultra-safe': 'Ultra-sicher',
  'very-safe': 'Sehr sicher',
  safe: 'Sicher',
  conservative: 'Konservativ',
  balanced: 'Ausgewogen',
  growth: 'Wachstum',
  aggressive: 'Aggressiv',
  speculative: 'Spekulativ',
  distressed: 'Notleidend'
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Builds the one-page PDF report. jsPDF is loaded on demand so it does not
 * increase the initial bundle size of the app.
 */
export async function buildPortfolioReport(input: PortfolioReportInput): Promise<jsPDF> {
  if (input.history.data.length < 2) {
    throw new Error('Zu wenige Daten für den PDF-Bericht.');
  }

  const { jsPDF: JsPDF } = await import('jspdf');
  const doc = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const createdAt = input.createdAt ?? new Date();
  const [startYear, endYear] = getYearRange(input.history.data);

  doc.setProperties({
    title: 'Finley – Portfolio-Bericht',
    subject: `Simulierte Portfolio-Entwicklung ${startYear} bis ${endYear}`,
    creator: 'Finley – Finance Simulation Game'
  });

  drawHeader(doc, createdAt, startYear, endYear);

  let y = 40;
  y = drawMetrics(doc, input.history, y, startYear, endYear);
  y = drawChart(doc, input.history.data, y + 9);
  drawAssetTable(doc, buildAssetRows(input), y + 7, startYear, endYear);
  drawFooter(doc);

  return doc;
}

/**
 * Builds the report and starts the download.
 */
export async function exportPortfolioPdf(input: PortfolioReportInput): Promise<void> {
  const doc = await buildPortfolioReport(input);
  const blob = doc.output('blob');
  downloadBlob(blob, buildExportFileName('pdf', input.createdAt));
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function drawHeader(doc: jsPDF, createdAt: Date, startYear: string, endYear: string): void {
  const height = 30;

  // Horizontal blue → indigo gradient like the app header (bg-gradient-to-r)
  const steps = 60;
  const stripWidth = PAGE_WIDTH / steps;
  for (let i = 0; i < steps; i++) {
    setFill(doc, mixColor(COLORS.blue600, COLORS.indigo600, i / (steps - 1)));
    doc.rect(i * stripWidth, 0, stripWidth + 0.3, height, 'F');
  }

  setText(doc, COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('Finley', MARGIN, 15);

  setText(doc, COLORS.blue100);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Portfolio-Bericht – Simulation ${startYear} bis ${endYear}`, MARGIN, 22);

  doc.setFontSize(8);
  doc.text(`Erstellt am ${formatGermanDate(createdAt)}`, PAGE_WIDTH - MARGIN, 15, { align: 'right' });
  doc.text(`Datenbasis: Seed „${GLOBAL_SEED}“`, PAGE_WIDTH - MARGIN, 20, { align: 'right' });
}

function drawMetrics(
  doc: jsPDF,
  history: PortfolioHistory,
  y: number,
  startYear: string,
  endYear: string
): number {
  const { metrics, data } = history;

  const cards: { label: string; value: string; color: RGB }[] = [
    { label: `Startwert ${startYear}`, value: formatEuro(data[0].value), color: COLORS.gray800 },
    { label: `Endwert ${endYear}`, value: formatEuro(metrics.totalValue), color: COLORS.gray800 },
    {
      label: 'Rendite p. a.',
      value: formatPercent(metrics.returnPA),
      color: metrics.returnPA >= 0 ? COLORS.green600 : COLORS.red600
    },
    { label: 'Volatilität p. a.', value: formatPercent(metrics.volatilityPA), color: COLORS.orange600 },
    { label: 'Max. Drawdown', value: formatPercent(metrics.maxDrawdown), color: COLORS.red600 }
  ];

  const gap = 3;
  const cardWidth = (CONTENT_WIDTH - gap * (cards.length - 1)) / cards.length;
  const cardHeight = 20;

  cards.forEach((card, index) => {
    const x = MARGIN + index * (cardWidth + gap);

    setFill(doc, COLORS.blue50);
    setDraw(doc, COLORS.blue200);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    setText(doc, COLORS.gray500);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(card.label, x + 3, y + 7);

    setText(doc, card.color);
    doc.setFont('helvetica', 'bold');
    fitFontSize(doc, card.value, cardWidth - 6, 12, 7);
    doc.text(card.value, x + 3, y + 15);
  });

  return y + cardHeight;
}

function drawChart(doc: jsPDF, data: DataPoint[], y: number): number {
  drawSectionTitle(doc, 'Portfolio-Performance', 'logarithmische Skala', y);

  const plotLeft = MARGIN + 18;
  const plotRight = PAGE_WIDTH - MARGIN;
  const plotTop = y + 6;
  const plotBottom = plotTop + 58;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;

  const values = data.map(p => p.value);
  const positive = values.filter(v => v > 0);
  if (positive.length < 2) {
    setText(doc, COLORS.gray500);
    doc.setFontSize(9);
    doc.text('Keine darstellbaren Daten vorhanden.', plotLeft, plotTop + 10);
    return plotBottom + 8;
  }

  // Log-scale domain with a little padding
  let logMin = Math.log10(Math.min(...positive));
  let logMax = Math.log10(Math.max(...positive));
  if (logMax - logMin < 0.1) {
    logMin -= 0.5;
    logMax += 0.5;
  }
  const padding = (logMax - logMin) * 0.05;
  logMin -= padding;
  logMax += padding;

  const toX = (index: number) => plotLeft + (index / (data.length - 1)) * plotWidth;
  const toY = (value: number) => {
    const clamped = Math.max(value, Math.pow(10, logMin));
    return plotBottom - ((Math.log10(clamped) - logMin) / (logMax - logMin)) * plotHeight;
  };

  // Horizontal grid lines + y-axis labels
  doc.setLineWidth(0.15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  for (const tick of niceLogTicks(Math.pow(10, logMin), Math.pow(10, logMax))) {
    const ty = toY(tick);
    setDraw(doc, COLORS.gray200);
    doc.line(plotLeft, ty, plotRight, ty);
    setText(doc, COLORS.gray500);
    doc.text(formatEuroCompact(tick), plotLeft - 2, ty, { align: 'right', baseline: 'middle' });
  }

  // Vertical grid lines + x-axis labels every 10 years
  data.forEach((point, index) => {
    const year = Number(point.date.slice(0, 4));
    const month = point.date.slice(5, 7);
    if (month === '01' && year % 10 === 0) {
      const tx = toX(index);
      setDraw(doc, COLORS.gray200);
      doc.line(tx, plotTop, tx, plotBottom);
      setText(doc, COLORS.gray500);
      doc.text(String(year), tx, plotBottom + 4, { align: 'center' });
    }
  });

  // Light area under the curve
  const points = data.map((point, index) => [toX(index), toY(point.value)] as const);
  const deltas: number[][] = [];
  for (let i = 1; i < points.length; i++) {
    deltas.push([points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]]);
  }
  const last = points[points.length - 1];
  const areaDeltas = [
    ...deltas,
    [0, plotBottom - last[1]],
    [points[0][0] - last[0], 0]
  ];
  setFill(doc, COLORS.blue50);
  doc.lines(areaDeltas, points[0][0], points[0][1], [1, 1], 'F', true);

  // Performance line
  setDraw(doc, COLORS.blue600);
  doc.setLineWidth(0.35);
  doc.lines(deltas, points[0][0], points[0][1], [1, 1], 'S', false);

  // Baseline
  setDraw(doc, COLORS.gray500);
  doc.setLineWidth(0.2);
  doc.line(plotLeft, plotBottom, plotRight, plotBottom);

  return plotBottom + 6;
}

interface AssetRow {
  name: string;
  sector: string;
  category: string;
  color: string;
  shares: number;
  startPrice: number;
  endValue: number;
  weight: number;
}

function buildAssetRows(input: PortfolioReportInput): AssetRow[] {
  const rows: AssetRow[] = [];

  for (const item of input.portfolio) {
    const asset = input.assets.find(a => a.id === item.assetId);
    if (!asset || asset.history.length === 0 || item.shares <= 0) continue;

    const { name, sector } = splitAssetName(asset.name);
    rows.push({
      name,
      sector,
      category: CATEGORY_LABELS[getAssetCategory(asset.id)],
      color: asset.color,
      shares: item.shares,
      startPrice: asset.history[0].value,
      endValue: item.shares * asset.history[asset.history.length - 1].value,
      weight: 0
    });
  }

  const total = rows.reduce((sum, row) => sum + row.endValue, 0);
  rows.forEach(row => {
    row.weight = total > 0 ? row.endValue / total : 0;
  });

  return rows.sort((a, b) => b.endValue - a.endValue);
}

function drawAssetTable(
  doc: jsPDF,
  rows: AssetRow[],
  y: number,
  startYear: string,
  endYear: string
): void {
  const positionLabel = rows.length === 1 ? '1 Position' : `${rows.length} Positionen`;
  drawSectionTitle(doc, 'Zusammensetzung', `${positionLabel}, sortiert nach Endwert`, y);

  const columns: { label: string; width: number; align: 'left' | 'right' }[] = [
    { label: 'Unternehmen', width: 50, align: 'left' },
    { label: 'Branche', width: 33, align: 'left' },
    { label: 'Risikoklasse', width: 22, align: 'left' },
    { label: 'Stück', width: 13, align: 'right' },
    { label: `Kurs ${startYear}`, width: 19, align: 'right' },
    { label: `Wert ${endYear}`, width: 25, align: 'right' },
    { label: 'Anteil', width: 18, align: 'right' }
  ];

  const headerTop = y + 4;
  const headerHeight = 6.5;
  const bodyTop = headerTop + headerHeight;
  const available = FOOTER_Y - 7 - bodyTop;
  const rowHeight = Math.min(6.5, available / Math.max(rows.length, 1));
  const fontSize = rowHeight >= 5 ? 7.5 : 6.5;

  // Header row
  setFill(doc, COLORS.gray100);
  doc.rect(MARGIN, headerTop, CONTENT_WIDTH, headerHeight, 'F');
  setText(doc, COLORS.gray800);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  let x = MARGIN;
  for (const column of columns) {
    const textX = column.align === 'left' ? x + 1.5 : x + column.width - 1.5;
    doc.text(column.label, textX, headerTop + headerHeight / 2, {
      align: column.align,
      baseline: 'middle'
    });
    x += column.width;
  }

  // Body rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize);

  rows.forEach((row, index) => {
    const rowTop = bodyTop + index * rowHeight;
    const centerY = rowTop + rowHeight / 2;

    if (index % 2 === 1) {
      setFill(doc, COLORS.gray50);
      doc.rect(MARGIN, rowTop, CONTENT_WIDTH, rowHeight, 'F');
    }

    const cells = [
      row.name,
      row.sector,
      row.category,
      String(row.shares),
      formatEuro(row.startPrice),
      formatEuro(row.endValue),
      formatPercent(row.weight)
    ];

    let cellX = MARGIN;
    cells.forEach((value, columnIndex) => {
      const column = columns[columnIndex];
      setText(doc, COLORS.gray800);

      if (columnIndex === 0) {
        // Asset color dot like in the sidebar
        setFill(doc, hexToRgb(row.color));
        doc.circle(cellX + 2.6, centerY, 1.1, 'F');
        const text = truncate(doc, value, column.width - 6);
        doc.text(text, cellX + 5, centerY, { baseline: 'middle' });
      } else if (column.align === 'left') {
        const text = truncate(doc, value, column.width - 3);
        doc.text(text, cellX + 1.5, centerY, { baseline: 'middle' });
      } else {
        const text = truncate(doc, value, column.width - 3);
        doc.text(text, cellX + column.width - 1.5, centerY, { align: 'right', baseline: 'middle' });
      }

      cellX += column.width;
    });
  });

  // Bottom border
  setDraw(doc, COLORS.gray200);
  doc.setLineWidth(0.2);
  const tableBottom = bodyTop + rows.length * rowHeight;
  doc.line(MARGIN, tableBottom, PAGE_WIDTH - MARGIN, tableBottom);
}

function drawFooter(doc: jsPDF): void {
  setDraw(doc, COLORS.gray200);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, FOOTER_Y - 3, PAGE_WIDTH - MARGIN, FOOTER_Y - 3);

  setText(doc, COLORS.gray500);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(
    'Simulierte Kursdaten – keine realen Kurse und keine Anlageberatung.',
    MARGIN,
    FOOTER_Y + 1
  );
  doc.text('Finley – Finance Simulation Game', PAGE_WIDTH - MARGIN, FOOTER_Y + 1, { align: 'right' });
}

function drawSectionTitle(doc: jsPDF, title: string, hint: string, y: number): void {
  setText(doc, COLORS.gray800);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(title, MARGIN, y);
  const titleWidth = doc.getTextWidth(title);

  setText(doc, COLORS.gray500);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`(${hint})`, MARGIN + titleWidth + 2, y);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Splits "Rheinsoft Solutions GmbH [Software]" into name and sector */
function splitAssetName(fullName: string): { name: string; sector: string } {
  const match = fullName.match(/^(.*?)\s*\[(.*)\]\s*$/);
  return match ? { name: match[1], sector: match[2] } : { name: fullName, sector: '' };
}

function getYearRange(data: DataPoint[]): [string, string] {
  return [data[0].date.slice(0, 4), data[data.length - 1].date.slice(0, 4)];
}

/**
 * Tick values for a log axis: 1-2-5 steps if that gives a readable number of
 * ticks, otherwise powers of ten (thinned out for very wide ranges).
 */
function niceLogTicks(min: number, max: number): number[] {
  const kMin = Math.floor(Math.log10(min));
  const kMax = Math.ceil(Math.log10(max));

  const collect = (multipliers: number[], step = 1) => {
    const ticks: number[] = [];
    for (let k = kMin; k <= kMax; k++) {
      if ((k - kMin) % step !== 0) continue;
      for (const m of multipliers) {
        const value = m * Math.pow(10, k);
        if (value >= min && value <= max) ticks.push(value);
      }
    }
    return ticks;
  };

  const fine = collect([1, 2, 5]);
  if (fine.length >= 2 && fine.length <= 7) return fine;

  if (fine.length < 2) return [min, max];

  let step = 1;
  let coarse = collect([1], step);
  while (coarse.length > 7) {
    step++;
    coarse = collect([1], step);
  }
  return coarse;
}

/** Shrinks the font size until the text fits into maxWidth */
function fitFontSize(doc: jsPDF, text: string, maxWidth: number, start: number, min: number): void {
  let size = start;
  doc.setFontSize(size);
  while (size > min && doc.getTextWidth(text) > maxWidth) {
    size -= 0.5;
    doc.setFontSize(size);
  }
}

/** Cuts the text and appends "…" if it is wider than maxWidth */
function truncate(doc: jsPDF, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && doc.getTextWidth(`${cut}…`) > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut.trimEnd()}…`;
}

function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '');
  const value = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function mixColor(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t)
  ];
}

function setFill(doc: jsPDF, [r, g, b]: RGB): void {
  doc.setFillColor(r, g, b);
}

function setDraw(doc: jsPDF, [r, g, b]: RGB): void {
  doc.setDrawColor(r, g, b);
}

function setText(doc: jsPDF, [r, g, b]: RGB): void {
  doc.setTextColor(r, g, b);
}
