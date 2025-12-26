import { addDays, addMonths, isBefore, isEqual, startOfDay } from 'date-fns';

/**
 * Parse the schedule pattern to determine collection frequency in days
 * Examples:
 *   "Tuesday fortnightly" -> 14
 *   "Every Tuesday" -> 7
 *   "Wednesday weekly" -> 7
 */
export function parseScheduleInterval(schedule: string): number {
  const lower = schedule.toLowerCase();

  if (lower.includes('fortnightly')) {
    return 14;
  }

  if (lower.includes('every') || lower.includes('weekly')) {
    return 7;
  }

  // Default to weekly if pattern not recognized
  return 7;
}

/**
 * Generate future collection dates based on a known date and schedule pattern
 *
 * @param startDate - A known collection date (typically "next collection" from council site)
 * @param schedule - The schedule pattern (e.g., "Tuesday fortnightly")
 * @param months - How many months ahead to generate (default 3)
 * @returns Array of collection dates (only future dates)
 */
export function generateCollectionDates(
  startDate: Date,
  schedule: string,
  months: number = 3
): Date[] {
  const interval = parseScheduleInterval(schedule);
  const today = startOfDay(new Date());
  const endDate = addMonths(today, months);
  const dates: Date[] = [];

  let current = startOfDay(startDate);

  // If start date is in the past, advance to the next occurrence
  // that is today or in the future
  // Limit iterations to prevent DoS with malformed dates
  let iterations = 0;
  const MAX_ITERATIONS = 200; // ~4 years at weekly interval
  while (isBefore(current, today) && iterations < MAX_ITERATIONS) {
    current = addDays(current, interval);
    iterations++;
  }

  // Generate dates from current forward
  while (isBefore(current, endDate) || isEqual(current, endDate)) {
    dates.push(new Date(current));
    current = addDays(current, interval);
  }

  return dates;
}

/**
 * Calculate what the next collection date SHOULD be based on pattern
 * (used to detect holiday deviations)
 *
 * @param lastKnownDate - The last known collection date
 * @param schedule - The schedule pattern
 * @returns The calculated next collection date
 */
export function calculateNextCollection(
  lastKnownDate: Date,
  schedule: string
): Date {
  const interval = parseScheduleInterval(schedule);
  return addDays(startOfDay(lastKnownDate), interval);
}

/**
 * Apply overrides to a list of calculated dates
 *
 * @param calculatedDates - Dates generated from pattern
 * @param overrides - Map of original date -> actual date (from holiday adjustments)
 * @returns Dates with overrides applied
 */
export function applyOverrides(
  calculatedDates: Date[],
  overrides: Map<string, Date>
): { date: Date; isOverride: boolean }[] {
  return calculatedDates.map(date => {
    const dateKey = formatDateKey(date);
    const override = overrides.get(dateKey);

    if (override) {
      return { date: override, isOverride: true };
    }

    return { date, isOverride: false };
  });
}

/**
 * Format a date as YYYY-MM-DD for use as a map key
 */
export function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format a date as YYYYMMDD for iCal
 * Uses UTC methods to ensure consistent output regardless of server timezone
 */
export function formatICalDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}
