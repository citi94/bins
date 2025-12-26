import { NextRequest, NextResponse } from 'next/server';
import { createSubscription, upsertCollections } from '@/lib/db';
import { scrapePropertyCollections } from '@/lib/scraper';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit';
import type { SubscribeRequest } from '@/types';

export async function POST(request: NextRequest) {
  // Rate limiting
  const clientIP = getClientIP(request);
  const rateLimit = checkRateLimit(`subscribe:${clientIP}`, RATE_LIMITS.subscribe);

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  try {
    const body: SubscribeRequest = await request.json();
    const { uprn, address, postcode } = body;

    if (!uprn || !address || !postcode) {
      return NextResponse.json(
        { error: 'UPRN, address, and postcode are required' },
        { status: 400 }
      );
    }

    // Validate UPRN format (10-12 digit numeric string)
    const uprnRegex = /^\d{10,12}$/;
    if (!uprnRegex.test(uprn)) {
      return NextResponse.json(
        { error: 'Invalid UPRN format' },
        { status: 400 }
      );
    }

    // Fetch current collection data from council site
    const collections = await scrapePropertyCollections(uprn);

    if (collections.length === 0) {
      return NextResponse.json(
        { error: 'No collection data found for this property' },
        { status: 404 }
      );
    }

    // Create subscription in database
    const subscription = await createSubscription(uprn, address, postcode);

    // Store the collection data
    await upsertCollections(uprn, collections);

    // Generate calendar URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
    const calendarUrl = `${baseUrl}/api/calendar/${subscription.calendarToken}`;

    return NextResponse.json({
      calendarUrl,
      token: subscription.calendarToken,
      services: collections.map(c => ({
        name: c.serviceName,
        schedule: c.schedule,
        nextCollection: c.nextCollection.toISOString().split('T')[0],
      })),
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
