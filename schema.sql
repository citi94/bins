-- Dover Bin Collection Calendar Service - Database Schema
-- Run this against your Neon PostgreSQL database

-- Store property subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uprn VARCHAR(20) NOT NULL UNIQUE,
  address TEXT NOT NULL,
  postcode VARCHAR(10) NOT NULL,
  calendar_token UUID DEFAULT gen_random_uuid() UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_fetched TIMESTAMPTZ
);

-- Current collection schedules (refreshed daily)
CREATE TABLE IF NOT EXISTS collections (
  id SERIAL PRIMARY KEY,
  uprn VARCHAR(20) NOT NULL,
  service_name VARCHAR(100) NOT NULL,
  schedule VARCHAR(100),
  next_collection DATE NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(uprn, service_name)
);

-- Holiday exceptions / overrides (the important bit!)
CREATE TABLE IF NOT EXISTS collection_overrides (
  id SERIAL PRIMARY KEY,
  uprn VARCHAR(20) NOT NULL,
  service_name VARCHAR(100) NOT NULL,
  original_date DATE NOT NULL,
  actual_date DATE NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(uprn, service_name, original_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_token ON subscriptions(calendar_token);
CREATE INDEX IF NOT EXISTS idx_collections_uprn ON collections(uprn);
CREATE INDEX IF NOT EXISTS idx_overrides_lookup ON collection_overrides(uprn, actual_date);
