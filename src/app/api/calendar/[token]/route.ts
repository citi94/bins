import { NextRequest, NextResponse } from 'next/server';
import { getSubscriptionByToken, getCollections, getCollectionOverrides } from '@/lib/db';
import { generateCollectionDates, formatDateKey } from '@/lib/dates';
import { generateICalendar } from '@/lib/ical';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit';
import type { CalendarEvent } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
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
    const { token } = await params;

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
      // Generate dates for the next 3 months based on pattern
      const dates = generateCollectionDates(
        collection.nextCollection,
        collection.schedule,
        3
      );

      // Apply any overrides
      const serviceOverrides = overrideMap.get(collection.serviceName) || new Map();
      const events: CalendarEvent[] = dates.map(date => {
        const dateKey = formatDateKey(date);
        const override = serviceOverrides.get(dateKey);

        if (override) {
          return {
            date: override,
            serviceName: collection.serviceName,
            isOverride: true,
          };
        }

        return {
          date,
          serviceName: collection.serviceName,
          isOverride: false,
        };
      });

      serviceEvents.push({
        serviceName: collection.serviceName,
        events,
      });
    }

    // Generate iCal content
    // Use postcode only in calendar name to avoid exposing full address
    const icalContent = generateICalendar(serviceEvents, {
      calendarName: `Bin Collection - ${subscription.postcode}`,
      uprn: subscription.uprn,
    });

    // Return iCal with proper headers
    // Use postcode in filename instead of UPRN to avoid property identification
    const safePostcode = subscription.postcode.replace(/\s+/g, '');
    return new NextResponse(icalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="bins-${safePostcode}.ics"`,
        // Allow calendar apps to refresh periodically
        'Cache-Control': 'public, max-age=3600', // 1 hour cache
      },
    });
  } catch (error) {
    console.error('Calendar generation error:', error);
    return new NextResponse('Failed to generate calendar', { status: 500 });
  }
}
