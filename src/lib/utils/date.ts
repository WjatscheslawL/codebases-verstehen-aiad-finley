/**
 * Generates a sequence of dates from start year to end year
 * @param startYear - Starting year (e.g., 1920)
 * @param endYear - Ending year (e.g., 2025)
 * @param frequency - 'monthly' or 'daily'
 * @returns Array of date strings in ISO format
 */
export function generateDateRange(
  startYear: number,
  endYear: number,
  frequency: 'monthly' | 'daily' = 'monthly'
): string[] {
  const dates: string[] = [];

  if (frequency === 'monthly') {
    for (let year = startYear; year <= endYear; year++) {
      for (let month = 0; month < 12; month++) {
        // Build the ISO string directly: toISOString() converts to UTC and would
        // shift the date to the previous day in time zones east of UTC (e.g. CET)
        dates.push(`${year}-${String(month + 1).padStart(2, '0')}-01`);
      }
    }
  } else {
    // Daily frequency (simplified - using 365 days per year)
    const startDate = new Date(startYear, 0, 1);
    const endDate = new Date(endYear, 11, 31);
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      dates.push(toLocalIsoDate(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  return dates;
}

/**
 * Calculate years between two dates
 */
export function yearsBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
}

/**
 * Formats a date as YYYY-MM-DD in local time (no UTC conversion)
 */
function toLocalIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
