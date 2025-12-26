import { NextRequest, NextResponse } from 'next/server';
import { deleteSubscriptionByToken, getSubscriptionByToken } from '@/lib/db';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  // Rate limiting
  const clientIP = getClientIP(request);
  const rateLimit = checkRateLimit(`delete:${clientIP}`, RATE_LIMITS.delete);

  if (!rateLimit.success) {
    return new NextResponse(generateHTML('Too many requests. Please try again later.', false), {
      status: 429,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
      },
    });
  }

  const { token } = await params;

  // Validate token format (should be UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) {
    return new NextResponse(generateHTML('Invalid calendar token', false), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Check if subscription exists
  const subscription = await getSubscriptionByToken(token);
  if (!subscription) {
    return new NextResponse(generateHTML('Calendar subscription not found', false), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Show confirmation page (GET request)
  return new NextResponse(generateConfirmationHTML(subscription.address, token), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  // Rate limiting
  const clientIP = getClientIP(request);
  const rateLimit = checkRateLimit(`delete:${clientIP}`, RATE_LIMITS.delete);

  if (!rateLimit.success) {
    return new NextResponse(generateHTML('Too many requests. Please try again later.', false), {
      status: 429,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
      },
    });
  }

  const { token } = await params;

  // Validate token format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) {
    return new NextResponse(generateHTML('Invalid calendar token', false), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  try {
    const deleted = await deleteSubscriptionByToken(token);

    if (!deleted) {
      return new NextResponse(generateHTML('Calendar subscription not found', false), {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    return new NextResponse(generateHTML('Your subscription and all data have been deleted.', true), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    console.error('Delete error:', error);
    return new NextResponse(generateHTML('Failed to delete subscription. Please try again.', false), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

function generateConfirmationHTML(address: string, token: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Delete Subscription - Dover Bin Collection Calendar</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; min-height: 100vh; padding: 2rem 1rem; }
    .container { max-width: 500px; margin: 0 auto; }
    .card { background: white; border-radius: 12px; padding: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
    h1 { color: #0f172a; font-size: 1.5rem; margin-bottom: 1rem; }
    p { color: #475569; line-height: 1.6; margin-bottom: 1rem; }
    .address { background: #f1f5f9; padding: 0.75rem 1rem; border-radius: 8px; font-weight: 500; color: #0f172a; margin: 1rem 0; }
    .warning { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
    .buttons { display: flex; gap: 1rem; margin-top: 1.5rem; }
    .btn { padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 500; text-decoration: none; text-align: center; flex: 1; cursor: pointer; border: none; font-size: 1rem; }
    .btn-danger { background: #dc2626; color: white; }
    .btn-danger:hover { background: #b91c1c; }
    .btn-cancel { background: #f1f5f9; color: #475569; }
    .btn-cancel:hover { background: #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>Delete Subscription</h1>
      <p>You are about to delete your bin collection calendar subscription for:</p>
      <div class="address">${escapeHTML(address)}</div>
      <div class="warning">
        <strong>This action cannot be undone.</strong><br>
        All your data including collection schedules will be permanently deleted.
      </div>
      <form method="POST" action="/api/calendar/${token}/delete">
        <div class="buttons">
          <a href="/" class="btn btn-cancel">Cancel</a>
          <button type="submit" class="btn btn-danger">Delete my data</button>
        </div>
      </form>
    </div>
  </div>
</body>
</html>`;
}

function generateHTML(message: string, success: boolean): string {
  const title = success ? 'Data Deleted' : 'Error';
  const bgColor = success ? '#f0fdf4' : '#fef2f2';
  const borderColor = success ? '#86efac' : '#fecaca';
  const textColor = success ? '#166534' : '#991b1b';
  const icon = success ? '✓' : '✕';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Dover Bin Collection Calendar</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; min-height: 100vh; padding: 2rem 1rem; display: flex; align-items: center; justify-content: center; }
    .container { max-width: 500px; }
    .card { background: white; border-radius: 12px; padding: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; text-align: center; }
    .icon { width: 64px; height: 64px; border-radius: 50%; background: ${bgColor}; border: 2px solid ${borderColor}; color: ${textColor}; font-size: 2rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; }
    h1 { color: #0f172a; font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #475569; line-height: 1.6; }
    .btn { display: inline-block; margin-top: 1.5rem; padding: 0.75rem 1.5rem; background: #3b82f6; color: white; border-radius: 8px; text-decoration: none; font-weight: 500; }
    .btn:hover { background: #2563eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="icon">${icon}</div>
      <h1>${title}</h1>
      <p>${escapeHTML(message)}</p>
      <a href="/" class="btn">Go to homepage</a>
    </div>
  </div>
</body>
</html>`;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
