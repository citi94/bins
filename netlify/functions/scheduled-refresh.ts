import type { Config, Context } from '@netlify/functions';
import { neon } from '@netlify/neon';
import * as cheerio from 'cheerio';
import { addDays } from 'date-fns';

const DOVER_BASE_URL = 'https://collections.dover.gov.uk';

interface Subscription {
  uprn: string;
  address: string;
}

interface CollectionService {
  serviceName: string;
  schedule: string;
  nextCollection: Date;
}

// Scheduled function runs daily at 6am UTC
export const config: Config = {
  schedule: '0 6 * * *',
};

export default async function handler(_request: Request, _context: Context) {
  console.log('Starting scheduled refresh of bin collection data...');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL not configured');
    return new Response('Database not configured', { status: 500 });
  }

  const sql = neon(databaseUrl);

  try {
    // Get all active subscriptions
    const subscriptions = await sql`
      SELECT uprn, address FROM subscriptions ORDER BY created_at
    `;

    console.log(`Found ${subscriptions.length} subscriptions to refresh`);

    let successCount = 0;
    let errorCount = 0;

    for (const sub of subscriptions as Subscription[]) {
      try {
        console.log(`Refreshing data for UPRN ${sub.uprn}...`);

        // Fetch current collection data from council site
        const services = await scrapePropertyCollections(sub.uprn);

        if (services.length === 0) {
          console.warn(`No services found for UPRN ${sub.uprn}`);
          continue;
        }

        // Get existing collection data to detect changes
        const existing = await sql`
          SELECT service_name, schedule, next_collection
          FROM collections
          WHERE uprn = ${sub.uprn}
        `;

        const existingMap = new Map(
          (existing as { service_name: string; schedule: string; next_collection: string }[]).map(
            (e) => [e.service_name, { schedule: e.schedule, nextCollection: new Date(e.next_collection) }]
          )
        );

        // Update collections and detect holiday changes
        for (const service of services) {
          const prev = existingMap.get(service.serviceName);

          if (prev) {
            // Check if the new date differs from what we'd calculate
            const expectedNext = calculateExpectedNext(prev.nextCollection, prev.schedule);
            const actualNext = service.nextCollection;

            // If dates differ by more than a day, it's likely a holiday adjustment
            const diffDays = Math.abs(
              (actualNext.getTime() - expectedNext.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (diffDays >= 1) {
              console.log(
                `Holiday adjustment detected for ${service.serviceName}: ` +
                  `expected ${expectedNext.toISOString().split('T')[0]}, ` +
                  `got ${actualNext.toISOString().split('T')[0]}`
              );

              // Store the override
              await sql`
                INSERT INTO collection_overrides (uprn, service_name, original_date, actual_date, detected_at)
                VALUES (${sub.uprn}, ${service.serviceName}, ${expectedNext}, ${actualNext}, NOW())
                ON CONFLICT (uprn, service_name, original_date) DO UPDATE SET
                  actual_date = EXCLUDED.actual_date,
                  detected_at = NOW()
              `;
            }
          }

          // Update the collection record
          await sql`
            INSERT INTO collections (uprn, service_name, schedule, next_collection, fetched_at)
            VALUES (${sub.uprn}, ${service.serviceName}, ${service.schedule}, ${service.nextCollection}, NOW())
            ON CONFLICT (uprn, service_name) DO UPDATE SET
              schedule = EXCLUDED.schedule,
              next_collection = EXCLUDED.next_collection,
              fetched_at = NOW()
          `;
        }

        // Update last_fetched on subscription
        await sql`
          UPDATE subscriptions SET last_fetched = NOW() WHERE uprn = ${sub.uprn}
        `;

        successCount++;

        // Small delay to be nice to the council's server
        await sleep(500);
      } catch (error) {
        console.error(`Error refreshing UPRN ${sub.uprn}:`, error);
        errorCount++;
      }
    }

    // Clean up old overrides (more than 1 year old)
    await sql`
      DELETE FROM collection_overrides
      WHERE actual_date < CURRENT_DATE - INTERVAL '1 year'
    `;

    const summary = `Refresh complete: ${successCount} success, ${errorCount} errors`;
    console.log(summary);

    return new Response(summary, { status: 200 });
  } catch (error) {
    console.error('Scheduled refresh failed:', error);
    return new Response('Refresh failed', { status: 500 });
  }
}

/**
 * Scrape collection services for a given property UPRN
 */
async function scrapePropertyCollections(uprn: string): Promise<CollectionService[]> {
  const response = await fetch(`${DOVER_BASE_URL}/property/${uprn}`, {
    headers: {
      Accept: 'text/html',
      'User-Agent': 'DoverBinsCalendar/1.0 (scheduled-refresh)',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch property: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const services: CollectionService[] = [];

  $('.service-wrapper.property-service-wrapper').each((_, element) => {
    const $service = $(element);

    const serviceName = $service.find('h3.service-name').text().trim();
    const schedule = $service.find('td.schedule div').text().trim();

    const nextCollectionText = $service
      .find('td.next-service')
      .contents()
      .filter(function () {
        return this.type === 'text';
      })
      .text()
      .trim();

    const nextCollection = parseUKDate(nextCollectionText);

    if (serviceName && nextCollection) {
      services.push({
        serviceName,
        schedule,
        nextCollection,
      });
    }
  });

  return services;
}

/**
 * Parse a UK date string (DD/MM/YYYY) to a Date object
 */
function parseUKDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;

  const [, day, month, year] = match;
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

/**
 * Calculate expected next collection based on schedule pattern
 */
function calculateExpectedNext(lastDate: Date, schedule: string): Date {
  const lower = schedule.toLowerCase();
  const interval = lower.includes('fortnightly') ? 14 : 7;
  return addDays(lastDate, interval);
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
