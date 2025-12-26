import { neon } from '@netlify/neon';
import { v4 as uuidv4 } from 'uuid';
import type { Subscription, Collection, CollectionOverride, CollectionService } from '@/types';

// Create SQL client
function getSQL() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return neon(databaseUrl);
}

/**
 * Create a new subscription for a property
 */
export async function createSubscription(
  uprn: string,
  address: string,
  postcode: string
): Promise<Subscription> {
  const sql = getSQL();
  const token = uuidv4();

  const result = await sql`
    INSERT INTO subscriptions (uprn, address, postcode, calendar_token)
    VALUES (${uprn}, ${address}, ${postcode}, ${token})
    ON CONFLICT (uprn) DO UPDATE SET
      address = EXCLUDED.address,
      postcode = EXCLUDED.postcode
    RETURNING id, uprn, address, postcode, calendar_token, created_at, last_fetched
  `;

  const row = result[0];
  return {
    id: row.id,
    uprn: row.uprn,
    address: row.address,
    postcode: row.postcode,
    calendarToken: row.calendar_token,
    createdAt: new Date(row.created_at),
    lastFetched: row.last_fetched ? new Date(row.last_fetched) : null,
  };
}

/**
 * Get a subscription by calendar token
 */
export async function getSubscriptionByToken(token: string): Promise<Subscription | null> {
  const sql = getSQL();

  const result = await sql`
    SELECT id, uprn, address, postcode, calendar_token, created_at, last_fetched
    FROM subscriptions
    WHERE calendar_token = ${token}
  `;

  if (result.length === 0) return null;

  const row = result[0];
  return {
    id: row.id,
    uprn: row.uprn,
    address: row.address,
    postcode: row.postcode,
    calendarToken: row.calendar_token,
    createdAt: new Date(row.created_at),
    lastFetched: row.last_fetched ? new Date(row.last_fetched) : null,
  };
}

/**
 * Get all active subscriptions
 */
export async function getAllSubscriptions(): Promise<Subscription[]> {
  const sql = getSQL();

  const result = await sql`
    SELECT id, uprn, address, postcode, calendar_token, created_at, last_fetched
    FROM subscriptions
    ORDER BY created_at DESC
  `;

  return result.map(row => ({
    id: row.id,
    uprn: row.uprn,
    address: row.address,
    postcode: row.postcode,
    calendarToken: row.calendar_token,
    createdAt: new Date(row.created_at),
    lastFetched: row.last_fetched ? new Date(row.last_fetched) : null,
  }));
}

/**
 * Update collections for a property
 */
export async function upsertCollections(
  uprn: string,
  services: CollectionService[]
): Promise<void> {
  const sql = getSQL();

  for (const service of services) {
    await sql`
      INSERT INTO collections (uprn, service_name, schedule, next_collection, fetched_at)
      VALUES (${uprn}, ${service.serviceName}, ${service.schedule}, ${service.nextCollection}, NOW())
      ON CONFLICT (uprn, service_name) DO UPDATE SET
        schedule = EXCLUDED.schedule,
        next_collection = EXCLUDED.next_collection,
        fetched_at = NOW()
    `;
  }

  // Update last_fetched on subscription
  await sql`
    UPDATE subscriptions SET last_fetched = NOW() WHERE uprn = ${uprn}
  `;
}

/**
 * Get collections for a property
 */
export async function getCollections(uprn: string): Promise<Collection[]> {
  const sql = getSQL();

  const result = await sql`
    SELECT id, uprn, service_name, schedule, next_collection, fetched_at
    FROM collections
    WHERE uprn = ${uprn}
    ORDER BY service_name
  `;

  return result.map(row => ({
    id: row.id,
    uprn: row.uprn,
    serviceName: row.service_name,
    schedule: row.schedule,
    nextCollection: new Date(row.next_collection),
    fetchedAt: new Date(row.fetched_at),
  }));
}

/**
 * Store a collection override (holiday adjustment)
 */
export async function upsertCollectionOverride(
  uprn: string,
  serviceName: string,
  originalDate: Date,
  actualDate: Date
): Promise<void> {
  const sql = getSQL();

  await sql`
    INSERT INTO collection_overrides (uprn, service_name, original_date, actual_date, detected_at)
    VALUES (${uprn}, ${serviceName}, ${originalDate}, ${actualDate}, NOW())
    ON CONFLICT (uprn, service_name, original_date) DO UPDATE SET
      actual_date = EXCLUDED.actual_date,
      detected_at = NOW()
  `;
}

/**
 * Get collection overrides for a property
 */
export async function getCollectionOverrides(uprn: string): Promise<CollectionOverride[]> {
  const sql = getSQL();

  const result = await sql`
    SELECT id, uprn, service_name, original_date, actual_date, detected_at
    FROM collection_overrides
    WHERE uprn = ${uprn}
      AND actual_date >= CURRENT_DATE
    ORDER BY actual_date
  `;

  return result.map(row => ({
    id: row.id,
    uprn: row.uprn,
    serviceName: row.service_name,
    originalDate: new Date(row.original_date),
    actualDate: new Date(row.actual_date),
    detectedAt: new Date(row.detected_at),
  }));
}
