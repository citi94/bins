import { formatICalDate } from './dates';
import { addDays } from 'date-fns';
import { createHash } from 'crypto';
import type { CalendarEvent } from '@/types';

interface ICalOptions {
  calendarName: string;
  uprn: string;
}

/**
 * Map service names to bin colors/descriptions for calendar events
 */
const SERVICE_DESCRIPTIONS: Record<string, string> = {
  'Refuse Collection': 'Put out your black bin (general waste)',
  'Paper/Card Collection': 'Put out your blue bin (paper and card)',
  'Recycling Collection': 'Put out your green bin (mixed recycling)',
  'Food Collection': 'Put out your food waste caddy',
  'Garden Waste Collection': 'Put out your brown bin (garden waste)',
};

/**
 * Generate an iCal calendar string from collection events
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

  // Add each event
  for (const service of events) {
    for (const event of service.events) {
      lines.push(...generateEvent(service.serviceName, event, options.uprn));
    }
  }

  lines.push('END:VCALENDAR');

  // Fold lines that exceed 75 characters
  return lines.map(foldLine).join('\r\n');
}

/**
 * Generate a VEVENT block for a single collection event
 */
function generateEvent(
  serviceName: string,
  event: CalendarEvent,
  uprn: string
): string[] {
  const dateStr = formatICalDate(event.date);
  const nextDay = formatICalDate(addDays(event.date, 1));
  const uid = generateEventUID(serviceName, event.date, uprn);
  const description = SERVICE_DESCRIPTIONS[serviceName] || `${serviceName} day`;

  // Add note if this is a holiday-adjusted date
  const summary = event.isOverride
    ? `${serviceName} (changed date)`
    : serviceName;

  const fullDescription = event.isOverride
    ? `${description}\n\nNote: This collection date was changed, likely due to a bank holiday.`
    : description;

  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICalTimestamp(new Date())}`,
    `DTSTART;VALUE=DATE:${dateStr}`,
    `DTEND;VALUE=DATE:${nextDay}`,
    `SUMMARY:${escapeICalText(summary)}`,
    `DESCRIPTION:${escapeICalText(fullDescription)}`,
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
