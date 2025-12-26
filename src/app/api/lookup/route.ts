import { NextRequest, NextResponse } from 'next/server';
import { lookupAddresses } from '@/lib/scraper';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit';

// Dover District Council covers these postcode areas
// CT13 (Sandwich), CT14 (Deal/Walmer), CT15, CT16, CT17 (Dover)
// Also some properties in CT1, CT3, CT4 on the district boundary
const DOVER_DISTRICT_PREFIXES = ['CT13', 'CT14', 'CT15', 'CT16', 'CT17', 'CT1', 'CT3', 'CT4'];

function isDoverDistrictPostcode(postcode: string): boolean {
  const normalized = postcode.replace(/\s/g, '').toUpperCase();
  return DOVER_DISTRICT_PREFIXES.some(prefix => normalized.startsWith(prefix));
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const clientIP = getClientIP(request);
  const rateLimit = checkRateLimit(`lookup:${clientIP}`, RATE_LIMITS.lookup);

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
    const body = await request.json();
    const { postcode } = body;

    if (!postcode || typeof postcode !== 'string') {
      return NextResponse.json(
        { error: 'Postcode is required' },
        { status: 400 }
      );
    }

    // Normalize postcode (remove extra spaces, uppercase)
    const normalizedPostcode = postcode.trim().toUpperCase();

    // Validate UK postcode format (basic check)
    const postcodeRegex = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
    if (!postcodeRegex.test(normalizedPostcode)) {
      return NextResponse.json(
        { error: 'Invalid UK postcode format' },
        { status: 400 }
      );
    }

    // Check if postcode is in Dover District area
    if (!isDoverDistrictPostcode(normalizedPostcode)) {
      return NextResponse.json(
        { error: 'This service is only available for Dover District Council addresses (CT13-CT17 postcodes)' },
        { status: 400 }
      );
    }

    const addresses = await lookupAddresses(normalizedPostcode);

    if (addresses.length === 0) {
      return NextResponse.json(
        { error: 'No addresses found for this postcode in Dover District' },
        { status: 404 }
      );
    }

    return NextResponse.json({ addresses });
  } catch (error) {
    console.error('Lookup error:', error);
    return NextResponse.json(
      { error: 'Failed to lookup addresses' },
      { status: 500 }
    );
  }
}
