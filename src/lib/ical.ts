import { formatICalDate, formatDateKey } from './dates';
import { addDays } from 'date-fns';
import { createHash } from 'crypto';
import type { CalendarEvent } from '@/types';

interface ICalOptions {
  calendarName: string;
  uprn: string;
}

/**
 * Map service names to friendly bin names
 */
const SERVICE_NAMES: Record<string, string> = {
  'Refuse Collection': 'General Waste',
  'Paper/Card Collection': 'Paper/Card',
  'Recycling Collection': 'Recycling',
  'Food Collection': 'Food',
  'Garden Waste Collection': 'Garden Waste',
};

/**
 * Map service names to simple descriptions
 */
const SERVICE_DESCRIPTIONS: Record<string, string> = {
  'Refuse Collection': 'General waste',
  'Paper/Card Collection': 'Paper and card',
  'Recycling Collection': 'Recycling',
  'Food Collection': 'Food waste',
  'Garden Waste Collection': 'Garden waste',
};

/**
 * Get friendly name for a service
 */
function getFriendlyName(serviceName: string): string {
  return SERVICE_NAMES[serviceName] || serviceName.replace(' Collection', '');
}

/**
 * Generate an iCal calendar string from collection events
 * Groups all collections on the same day into a single event
 */
export function generateICalendar(
  events: { serviceName: string; events: CalendarEvent[] }[],
  options: ICalOptions
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Dover Bins//doverbins.app//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICalText(options.calendarName)}`,
    'X-WR-TIMEZONE:Europe/London',
  ];

  // Group all events by date
  const eventsByDate = new Map<string, { services: string[]; date: Date; hasOverride: boolean }>();

  for (const service of events) {
    for (const event of service.events) {
      const dateKey = formatDateKey(event.date);

      if (!eventsByDate.has(dateKey)) {
        eventsByDate.set(dateKey, {
          services: [],
          date: event.date,
          hasOverride: false,
        });
      }

      const dayEvent = eventsByDate.get(dateKey)!;
      dayEvent.services.push(service.serviceName);
      if (event.isOverride) {
        dayEvent.hasOverride = true;
      }
    }
  }

  // Check if property has food collection service
  const hasFood = events.some(e => e.serviceName === 'Food Collection');

  // Generate one event per day
  for (const [dateKey, dayEvent] of eventsByDate) {
    const nonFoodServices = dayEvent.services.filter(s => s !== 'Food Collection');

    // Skip food-only days - food is always collected alongside other bins
    if (nonFoodServices.length === 0) {
      continue;
    }

    // Food goes out every week, so add it to any collection day that's missing it
    // (This handles the case where food's calculated dates don't align with other bins
    // due to holiday-adjusted start dates)
    if (hasFood && !dayEvent.services.includes('Food Collection')) {
      dayEvent.services.push('Food Collection');
    }

    lines.push(...generateDayEvent(dayEvent.services, dayEvent.date, dayEvent.hasOverride, options.uprn));
  }

  lines.push('END:VCALENDAR');

  // Fold lines that exceed 75 bytes
  return lines.map(foldLine).join('\r\n');
}

/**
 * Generate a VEVENT block for a day's collections
 *
 * Events are categorized by main bin type for easy visual scanning:
 * - Recycling days: green color, title starts with "Recycling"
 * - General Waste days: gray color, title starts with "General Waste"
 */
function generateDayEvent(
  serviceNames: string[],
  date: Date,
  hasOverride: boolean,
  uprn: string
): string[] {
  const dateStr = formatICalDate(date);
  const nextDay = formatICalDate(addDays(date, 1));
  const uid = generateEventUID('bins', date, uprn);

  // Determine the "main" bin type for this day
  const hasRecycling = serviceNames.includes('Recycling Collection');
  const hasGeneralWaste = serviceNames.includes('Refuse Collection');
  const hasGardenWaste = serviceNames.includes('Garden Waste Collection');

  // Set main type and color based on primary bin
  let mainType: string;
  let color: string;

  if (hasRecycling) {
    mainType = 'Recycling';
    color = 'green';
  } else if (hasGeneralWaste) {
    mainType = 'General Waste';
    color = 'gray';
  } else if (hasGardenWaste) {
    mainType = 'Garden Waste';
    color = 'brown';
  } else {
    mainType = 'Bin Day';
    color = 'blue';
  }

  // Get secondary bins (excluding the main type already shown)
  const secondaryBins = serviceNames
    .filter(name => {
      if (hasRecycling && name === 'Recycling Collection') return false;
      if (hasGeneralWaste && name === 'Refuse Collection') return false;
      if (!hasRecycling && !hasGeneralWaste && hasGardenWaste && name === 'Garden Waste Collection') return false;
      return true;
    })
    .map(getFriendlyName);

  // Build summary: "Recycling: Paper/Card, Food" or "General Waste: Food"
  let summary: string;
  if (secondaryBins.length > 0) {
    summary = hasOverride
      ? `${mainType} (changed): ${secondaryBins.join(', ')}`
      : `${mainType}: ${secondaryBins.join(', ')}`;
  } else {
    summary = hasOverride ? `${mainType} (changed)` : mainType;
  }

  // Build description with all bin details
  const binDetails = serviceNames
    .map(name => SERVICE_DESCRIPTIONS[name] || name)
    .join('\n');

  const description = hasOverride
    ? `Put out:\n${binDetails}\n\nNote: Date changed due to bank holiday.`
    : `Put out:\n${binDetails}`;

  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICalTimestamp(new Date())}`,
    `DTSTART;VALUE=DATE:${dateStr}`,
    `DTEND;VALUE=DATE:${nextDay}`,
    `SUMMARY:${escapeICalText(summary)}`,
    `DESCRIPTION:${escapeICalText(description)}`,
    `COLOR:${color}`,
    'TRANSP:TRANSPARENT', // Show as free (all-day event)
    'END:VEVENT',
  ];
}

/**
 * Generate a unique event ID with hashed UPRN for privacy
 * The hash ensures UIDs remain stable (same UPRN = same hash) while
 * not exposing the actual property identifier
 */
function generateEventUID(serviceName: string, date: Date, uprn: string): string {
  const serviceKey = serviceName.toLowerCase().replace(/[^a-z]/g, '');
  const dateKey = formatICalDate(date);
  // Hash the UPRN to avoid exposing property identifiers
  const uprnHash = createHash('sha256').update(uprn).digest('hex').substring(0, 12);
  return `${serviceKey}-${uprnHash}-${dateKey}@doverbins.app`;
}

/**
 * Format a timestamp for DTSTAMP
 */
function formatICalTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Escape text for iCal format
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Fold long lines according to RFC 5545
 * Lines should be no longer than 75 octets (bytes), excluding the line break.
 * Folding is done by inserting a CRLF followed by a single whitespace.
 *
 * This implementation properly counts bytes, not characters, and avoids
 * splitting multi-byte UTF-8 characters.
 */
function foldLine(line: string): string {
  const MAX_BYTES = 75;

  // Quick check: if ASCII-only and short enough, return as-is
  const lineBytes = Buffer.byteLength(line, 'utf-8');
  if (lineBytes <= MAX_BYTES) {
    return line;
  }

  const result: string[] = [];
  let currentLine = '';
  let currentBytes = 0;
  let isFirstLine = true;

  for (const char of line) {
    const charBytes = Buffer.byteLength(char, 'utf-8');
    const maxForThisLine = isFirstLine ? MAX_BYTES : MAX_BYTES - 1; // -1 for leading space

    if (currentBytes + charBytes > maxForThisLine) {
      // Start a new line
      result.push(currentLine);
      currentLine = ' ' + char; // Continuation lines start with space
      currentBytes = 1 + charBytes;
      isFirstLine = false;
    } else {
      currentLine += char;
      currentBytes += charBytes;
    }
  }

  if (currentLine) {
    result.push(currentLine);
  }

  return result.join('\r\n');
}
