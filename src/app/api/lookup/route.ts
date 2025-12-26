import { NextRequest, NextResponse } from 'next/server';
import { lookupAddresses } from '@/lib/scraper';

export async function POST(request: NextRequest) {
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
