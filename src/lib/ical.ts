import { formatICalDate, formatDateKey } from './dates';
import { addDays } from 'date-fns';
import { createHash } from 'crypto';
import type { CalendarEvent } from '@/types';

interface ICalOptions {
  calendarName: string;
  uprn: string;
  filter?: 'recycling' | 'general' | null;
}

/**
 * Map service names to short friendly names for titles
 */
const SHORT_NAMES: Record<string, string> = {
  'Refuse Collection': 'General Waste',
  'Paper/Card Collection': 'Paper/Card',
  'Recycling Collection': 'Recycling',
  'Food Collection': 'Food',
  'Garden Waste Collection': 'Garden',
};

/**
 * Map service names to descriptions for the event body
 */
const DESCRIPTIONS: Record<string, string> = {
  'Refuse Collection': 'General waste bin',
  'Paper/Card Collection': 'Paper and card bin',
  'Recycling Collection': 'Recycling bin',
  'Food Collection': 'Food waste caddy',
  'Garden Waste Collection': 'Garden waste bin',
};

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
  for (const [, dayEvent] of eventsByDate) {
    const nonFoodServices = dayEvent.services.filter(s => s !== 'Food Collection');

    // Skip food-only days - food is always collected alongside other bins
    if (nonFoodServices.length === 0) {
      continue;
    }

    // Apply filter if specified (for separate colored calendars)
    if (options.filter === 'recycling') {
      // Only include days that have Recycling Collection
      if (!dayEvent.services.includes('Recycling Collection')) {
        continue;
      }
    } else if (options.filter === 'general') {
      // Only include days that have Refuse Collection (general waste)
      if (!dayEvent.services.includes('Refuse Collection')) {
        continue;
      }
    }

    // Food goes out every week, so add it to any collection day that's missing it
    if (hasFood && !dayEvent.services.includes('Food Collection')) {
      dayEvent.services.push('Food Collection');
    }

    lines.push(...generateDayEvent(dayEvent.services, dayEvent.date, dayEvent.hasOverride, options.uprn, options.filter));
  }

  lines.push('END:VCALENDAR');

  return lines.map(foldLine).join('\r\n');
}

/**
 * Generate a VEVENT block for a day's collections
 *
 * Title format: "Recycling, Paper/Card, Food - Bin Day"
 */
function generateDayEvent(
  serviceNames: string[],
  date: Date,
  hasOverride: boolean,
  uprn: string,
  filter?: 'recycling' | 'general' | null
): string[] {
  const dateStr = formatICalDate(date);
  const nextDay = formatICalDate(addDays(date, 1));

  // Include filter in UID so each calendar stream has unique event IDs
  const calendarType = filter || 'combined';
  const uid = generateEventUID(calendarType, date, uprn);

  // Determine color based on primary bin type
  const hasRecycling = serviceNames.includes('Recycling Collection');
  const hasGeneralWaste = serviceNames.includes('Refuse Collection');

  let color = 'blue';
  if (hasRecycling) {
    color = 'green';
  } else if (hasGeneralWaste) {
    color = 'gray';
  }

  // Build title listing all bins: "Recycling, Paper/Card, Food - Bin Day"
  const binNames = serviceNames
    .map(name => SHORT_NAMES[name] || name.replace(' Collection', ''))
    .join(', ');

  let summary = `${binNames} - Bin Day`;
  if (hasOverride) {
    summary = `${binNames} - Bin Day (changed)`;
  }

  // Build description with full details
  const binDetails = serviceNames
    .map(name => DESCRIPTIONS[name] || name)
    .join('\n');

  let description = `Put out:\n${binDetails}`;

  if (hasOverride) {
    description += '\n\nNote: Date changed due to bank holiday.';
  }

  if (!filter) {
    description += '\n\nTip: Want different colours for recycling vs general waste days? Visit doverbins.netlify.app to add separate calendars.';
  }

  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICalTimestamp(new Date())}`,
    `DTSTART;VALUE=DATE:${dateStr}`,
    `DTEND;VALUE=DATE:${nextDay}`,
    `SUMMARY:${escapeICalText(summary)}`,
    `DESCRIPTION:${escapeICalText(description)}`,
    `COLOR:${color}`,
    'TRANSP:TRANSPARENT',
    'END:VEVENT',
  ];
}

/**
 * Generate a unique event ID with hashed UPRN for privacy
 */
function generateEventUID(calendarType: string, date: Date, uprn: string): string {
  const typeKey = calendarType.toLowerCase().replace(/[^a-z]/g, '');
  const dateKey = formatICalDate(date);
  const uprnHash = createHash('sha256').update(uprn).digest('hex').substring(0, 12);
  return `${typeKey}-${uprnHash}-${dateKey}@doverbins.app`;
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
 */
function foldLine(line: string): string {
  const MAX_BYTES = 75;

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
    const maxForThisLine = isFirstLine ? MAX_BYTES : MAX_BYTES - 1;

    if (currentBytes + charBytes > maxForThisLine) {
      result.push(currentLine);
      currentLine = ' ' + char;
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
