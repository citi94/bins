# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dover Bin Collection Calendar - a service that scrapes Dover District Council's website and provides subscribable iCal calendars for bin collection dates. The key value is detecting holiday-adjusted collection dates automatically.

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
```

## Architecture

### Data Flow

1. **Postcode Lookup**: User enters postcode → `/api/lookup` POSTs to council site → returns addresses with UPRNs
2. **Subscription**: User selects address → `/api/subscribe` scrapes collection dates, stores in Neon DB, returns calendar URL
3. **Calendar Serving**: Calendar apps poll `/api/calendar/[token]` → generates ICS from DB data with 3-month lookahead
4. **Daily Refresh**: Netlify scheduled function re-scrapes all subscriptions, detects holiday deviations

### Key Modules

- `src/lib/scraper.ts` - Scrapes council site (cheerio). Two functions: `lookupAddresses()` and `scrapePropertyCollections()`
- `src/lib/dates.ts` - Parses schedules ("Tuesday fortnightly" → 14 days), generates future dates, applies overrides
- `src/lib/ical.ts` - Generates RFC 5545 compliant iCal output
- `src/lib/db.ts` - Neon serverless client. Tables: `subscriptions`, `collections`, `collection_overrides`

### Holiday Detection Logic

The `collection_overrides` table stores deviations from calculated patterns. When the daily refresh finds that the council's "next collection" differs from what we'd calculate based on the pattern, it's stored as an override. Calendar generation prioritizes overrides over calculated dates.

### External Dependencies

- **Dover Council API**: POST `https://collections.dover.gov.uk/property/` with `search_property=<postcode>&aj=true` returns JSON with addresses. GET `/property/<UPRN>` returns HTML with collection tables.
- **Neon**: Serverless PostgreSQL. Requires `DATABASE_URL` env var.

## Database Schema

See `schema.sql`. Three tables:
- `subscriptions` - property info + calendar token
- `collections` - current schedule per service (refreshed daily)
- `collection_overrides` - detected holiday adjustments
