import { NextRequest, NextResponse } from 'next/server';
import { getSubscriptionByToken, getCollections, getCollectionOverrides } from '@/lib/db';
import { generateCollectionDates, formatDateKey } from '@/lib/dates';
import { generateICalendar } from '@/lib/ical';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit';
import type { CalendarEvent } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; filter: string }> }
) {
  // Rate limiting
  const clientIP = getClientIP(request);
  const rateLimit = checkRateLimit(`calendar:${clientIP}`, RATE_LIMITS.calendar);

  if (!rateLimit.success) {
    return new NextResponse('Too many requests', {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
      },
    });
  }

  try {
    const { token, filter: filterParam } = await params;

    // Validate filter - only accept 'recycling' or 'general'
    if (filterParam !== 'recycling' && filterParam !== 'general') {
      return new NextResponse('Invalid filter. Use "recycling" or "general".', { status: 400 });
    }
    const filter: 'recycling' | 'general' = filterParam;

    // Get subscription
    const subscription = await getSubscriptionByToken(token);

    if (!subscription) {
      return new NextResponse('Calendar not found', { status: 404 });
    }

    // Get collections and overrides
    const collections = await getCollections(subscription.uprn);
    const overrides = await getCollectionOverrides(subscription.uprn);

    // Build override map (keyed by service name + original date)
    const overrideMap = new Map<string, Map<string, Date>>();
    for (const override of overrides) {
      if (!overrideMap.has(override.serviceName)) {
        overrideMap.set(override.serviceName, new Map());
      }
      overrideMap.get(override.serviceName)!.set(
        formatDateKey(override.originalDate),
        override.actualDate
      );
    }

    // Generate calendar events for each service
    const serviceEvents: { serviceName: string; events: CalendarEvent[] }[] = [];

    for (const collection of collections) {
      const generatedDates = generateCollectionDates(
        collection.nextCollection,
        collection.schedule,
        3
      );

      const serviceOverrides = overrideMap.get(collection.serviceName) || new Map();
      const events: CalendarEvent[] = generatedDates.map(item => {
        const dateKey = formatDateKey(item.date);
        const dbOverride = serviceOverrides.get(dateKey);

        if (dbOverride) {
          return { date: dbOverride, isOverride: true };
        }
        return { date: item.date, isOverride: item.isOverride };
      });

      serviceEvents.push({
        serviceName: collection.serviceName,
        events,
      });
    }

    // Generate iCal content
    const calendarName = filter === 'recycling'
      ? `Recycling Bins - ${subscription.postcode}`
      : `General Waste Bins - ${subscription.postcode}`;

    const icalContent = generateICalendar(serviceEvents, {
      calendarName,
      uprn: subscription.uprn,
      filter,
    });

    const safePostcode = subscription.postcode.replace(/\s+/g, '');
    const filename = filter === 'recycling'
      ? `recycling-${safePostcode}.ics`
      : `general-waste-${safePostcode}.ics`;

    return new NextResponse(icalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=1800',
      },
    });
  } catch (error) {
    console.error('Calendar generation error:', error);
    return new NextResponse('Failed to generate calendar', { status: 500 });
  }
}
