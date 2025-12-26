import { formatICalDate } from './dates';
import { addDays } from 'date-fns';
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

  return lines.join('\r\n');
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
 * Generate a unique event ID
 */
function generateEventUID(serviceName: string, date: Date, uprn: string): string {
  const serviceKey = serviceName.toLowerCase().replace(/[^a-z]/g, '');
  const dateKey = formatICalDate(date);
  return `${serviceKey}-${uprn}-${dateKey}@doverbins.app`;
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
