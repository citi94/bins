import * as cheerio from 'cheerio';
import type { Address, CollectionService, DoverLookupResponse } from '@/types';

const DOVER_BASE_URL = 'https://collections.dover.gov.uk';

/**
 * Look up addresses for a given postcode
 */
export async function lookupAddresses(postcode: string): Promise<Address[]> {
  const response = await fetch(`${DOVER_BASE_URL}/property/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: new URLSearchParams({
      search_property: postcode,
      aj: 'true',
      id: '',
      if: '',
      gac: 'FALSE',
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to lookup addresses: ${response.status}`);
  }

  const data: DoverLookupResponse = await response.json();

  if (data.status !== 'OK' || !data.result) {
    return [];
  }

  // Parse the HTML result to extract addresses
  const $ = cheerio.load(data.result);
  const addresses: Address[] = [];

  $('li a').each((_, element) => {
    const href = $(element).attr('href');
    const addressText = $(element).text().trim();

    if (href) {
      // Extract UPRN from href like "property/100062058171"
      const match = href.match(/property\/(\d+)/);
      if (match) {
        addresses.push({
          uprn: match[1],
          address: addressText,
        });
      }
    }
  });

  return addresses;
}

/**
 * Scrape collection services for a given property UPRN
 */
export async function scrapePropertyCollections(uprn: string): Promise<CollectionService[]> {
  const response = await fetch(`${DOVER_BASE_URL}/property/${uprn}`, {
    headers: {
      'Accept': 'text/html',
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

    // Extract service and task IDs from class names
    const classes = $service.attr('class') || '';
    const serviceIdMatch = classes.match(/service-id-(\d+)/);
    const taskIdMatch = classes.match(/task-id-(\d+)/);

    // Extract service name
    const serviceName = $service.find('h3.service-name').text().trim();

    // Extract schedule (e.g., "Tuesday fortnightly", "Every Tuesday")
    const schedule = $service.find('td.schedule div').text().trim();

    // Extract dates
    const lastCollectionText = $service.find('td.last-service').contents().filter(function() {
      return this.type === 'text';
    }).text().trim();

    const nextCollectionText = $service.find('td.next-service').contents().filter(function() {
      return this.type === 'text';
    }).text().trim();

    // Parse dates (format: DD/MM/YYYY)
    const lastCollection = parseUKDate(lastCollectionText);
    const nextCollection = parseUKDate(nextCollectionText);

    if (serviceName && nextCollection) {
      services.push({
        serviceId: serviceIdMatch?.[1] || '',
        taskId: taskIdMatch?.[1] || '',
        serviceName,
        schedule,
        lastCollection,
        nextCollection,
      });
    }
  });

  return services;
}

/**
 * Parse a UK date string (DD/MM/YYYY) to a Date object
 * Uses noon UTC to avoid timezone boundary issues - dates will always
 * represent the correct day regardless of server timezone
 */
function parseUKDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;

  const [, day, month, year] = match;
  // Create date at noon UTC to avoid day boundary issues
  // When converting to date-only in iCal, this will always be the correct day
  return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0));
}
