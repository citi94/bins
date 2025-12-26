# Dover Bin Collection Calendar

Subscribe to your Dover District Council bin collection dates as an iCal calendar. Get automatic updates when dates change for bank holidays.

## Features

- Enter your postcode and select your address
- Get a subscribable calendar URL that works with Apple Calendar, Google Calendar, Outlook, etc.
- Daily refresh detects holiday-adjusted collection dates automatically
- Supports all Dover bin types: Refuse, Recycling, Paper/Card, Food, Garden Waste

## Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Database**: Netlify DB (Neon PostgreSQL, auto-provisioned)
- **Hosting**: Netlify (with scheduled functions)
- **Scraping**: Cheerio for HTML parsing

## Setup

### 1. Deploy to Netlify

Push to GitHub and connect to Netlify. The `@netlify/neon` package triggers automatic database provisioning on first build.

### 2. Initialize Database Schema

After deployment, run the schema via Neon console or CLI:

```bash
psql $DATABASE_URL < schema.sql
```

You can find your DATABASE_URL in the Netlify dashboard under Extensions → Neon.

### 3. Claim Your Database

**Important**: Claim your database in the Netlify UI within 7 days to keep it running. Go to Extensions → Neon → Claim database.

### 4. Local Development

```bash
npm install
netlify dev  # Uses Netlify CLI for local dev with DB access
```

The `netlify.toml` configures:
- Next.js build
- Scheduled function for daily data refresh (6am UTC)

## API Endpoints

- `POST /api/lookup` - Postcode search (proxies to council site)
- `POST /api/subscribe` - Create calendar subscription
- `GET /api/calendar/[token]` - Serve ICS calendar file

## How It Works

1. User enters postcode → we query Dover Council's website
2. User selects address → we scrape collection data and create subscription
3. Calendar apps poll the ICS URL periodically
4. Daily scheduled job re-scrapes council site to detect holiday changes
5. If dates differ from expected pattern, we store overrides

## Data Source

Collection data is scraped from [collections.dover.gov.uk](https://collections.dover.gov.uk). This is an unofficial service.
