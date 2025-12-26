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
 * Parse the day of week from a schedule string
 * Examples: "Friday fortnightly" -> 5, "Every Tuesday" -> 2
 * Returns null if no day found
 */
export function parseDayOfWeek(schedule: string): number | null {
  const lower = schedule.toLowerCase();
  const days: [string, number][] = [
    ['sunday', 0],
    ['monday', 1],
    ['tuesday', 2],
    ['wednesday', 3],
    ['thursday', 4],
    ['friday', 5],
    ['saturday', 6],
  ];

  for (const [day, num] of days) {
    if (lower.includes(day)) {
      return num;
    }
  }
  return null;
}

/**
 * Find the nearest occurrence of a day of week to a given date
 * Used to find the "anchor" pattern date when a collection is holiday-shifted
 */
function findNearestDayOfWeek(fromDate: Date, targetDay: number): Date {
  const currentDay = fromDate.getDay();

  if (currentDay === targetDay) {
    return fromDate;
  }

  // Calculate days to previous and next occurrence
  const daysToPrev = (currentDay - targetDay + 7) % 7 || 7;
  const daysToNext = (targetDay - currentDay + 7) % 7 || 7;

  // Choose the closer one (prefer previous for holiday shifts)
  if (daysToPrev <= daysToNext) {
    return addDays(fromDate, -daysToPrev);
  } else {
    return addDays(fromDate, daysToNext);
  }
}

/**
 * Generate future collection dates based on schedule pattern
 *
 * Uses pattern-based calculation to handle holiday shifts correctly:
 * 1. Parse the expected day of week from schedule (e.g., "Friday")
 * 2. If nextCollection is on a different day, it's a holiday shift
 * 3. Find the "anchor" - the pattern date that was shifted
 * 4. Generate future dates on the pattern day (Fridays), not from the shifted date
 *
 * Example: nextCollection=Mon Dec 29 (shifted from Fri Dec 26), schedule="Friday fortnightly"
 * Output: Dec 29 (override), Jan 9, Jan 23, Feb 6... (all Fridays after the holiday)
 */
export function generateCollectionDates(
  nextCollection: Date,
  schedule: string,
  months: number = 3
): { date: Date; isOverride: boolean }[] {
  const interval = parseScheduleInterval(schedule);
  const expectedDayOfWeek = parseDayOfWeek(schedule);
  const today = startOfDay(new Date());
  const endDate = addMonths(today, months);
  const nextCollectionStart = startOfDay(nextCollection);

  // If we can't parse a day of week, fall back to simple interval addition
  if (expectedDayOfWeek === null) {
    return generateCollectionDatesLegacy(nextCollectionStart, interval, today, endDate);
  }

  // Check if next collection is shifted from expected pattern day
  const actualDayOfWeek = nextCollectionStart.getDay();
  const isShifted = actualDayOfWeek !== expectedDayOfWeek;

  // Find the anchor (the pattern date that nextCollection corresponds to)
  // e.g., Mon Dec 29 was shifted from Fri Dec 26
  const anchorDate = isShifted
    ? findNearestDayOfWeek(nextCollectionStart, expectedDayOfWeek)
    : nextCollectionStart;

  const results: { date: Date; isOverride: boolean }[] = [];

  // If nextCollection is in the future (or today), include it as first date
  if (!isBefore(nextCollectionStart, today)) {
    results.push({ date: new Date(nextCollectionStart), isOverride: isShifted });
  }

  // Generate pattern dates starting from anchor + interval
  // (anchor itself is represented by nextCollection, whether shifted or not)
  let current = addDays(anchorDate, interval);

  // Advance to near today if needed (for stale data)
  let iterations = 0;
  const MAX_ITERATIONS = 200;
  while (isBefore(current, today) && iterations < MAX_ITERATIONS) {
    current = addDays(current, interval);
    iterations++;
  }

  // Generate future pattern dates
  while ((isBefore(current, endDate) || isEqual(current, endDate)) && iterations < MAX_ITERATIONS) {
    results.push({ date: new Date(current), isOverride: false });
    current = addDays(current, interval);
    iterations++;
  }

  return results;
}

/**
 * Legacy date generation for schedules without a parseable day of week
 * Simply adds intervals from the start date
 */
function generateCollectionDatesLegacy(
  startDate: Date,
  interval: number,
  today: Date,
  endDate: Date
): { date: Date; isOverride: boolean }[] {
  const results: { date: Date; isOverride: boolean }[] = [];
  let current = startDate;

  // Advance to today if start is in the past
  let iterations = 0;
  const MAX_ITERATIONS = 200;
  while (isBefore(current, today) && iterations < MAX_ITERATIONS) {
    current = addDays(current, interval);
    iterations++;
  }

  // Generate dates
  while ((isBefore(current, endDate) || isEqual(current, endDate)) && iterations < MAX_ITERATIONS) {
    results.push({ date: new Date(current), isOverride: false });
    current = addDays(current, interval);
    iterations++;
  }

  return results;
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
