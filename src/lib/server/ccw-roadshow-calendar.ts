/**
 * Adds a confirmed roadshow registrant as a guest on the matching Google
 * Calendar event. Uses the Calendar REST API directly via fetch + an OAuth
 * refresh-token grant, so it needs no heavyweight Google SDK.
 *
 * Safe no-op when credentials are absent, and never throws — registration must
 * not break if calendar sync fails.
 */

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'phill.mcgurk@gmail.com';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

function getCredentials(): { clientId: string; clientSecret: string; refreshToken: string } | null {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_CALENDAR_OAUTH_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }
  return { clientId, clientSecret, refreshToken };
}

async function getAccessToken(creds: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<string | null> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: creds.refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    console.error('[ccw-roadshow-calendar] token refresh failed:', res.status);
    return null;
  }
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

type CalendarAttendee = { email?: string };

export async function addRegistrationToCalendar(params: {
  calendarEventId: string;
  attendeeEmail: string;
}): Promise<boolean> {
  const creds = getCredentials();
  if (!creds) {
    console.warn('[ccw-roadshow-calendar] Google Calendar credentials absent — skipping sync.');
    return false;
  }

  try {
    const accessToken = await getAccessToken(creds);
    if (!accessToken) {
      return false;
    }

    const eventUrl = `${CALENDAR_API}/calendars/${encodeURIComponent(
      CALENDAR_ID,
    )}/events/${encodeURIComponent(params.calendarEventId)}`;

    const getRes = await fetch(eventUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!getRes.ok) {
      console.error('[ccw-roadshow-calendar] failed to load event:', getRes.status);
      return false;
    }

    const event = (await getRes.json()) as { attendees?: CalendarAttendee[] };
    const attendees = event.attendees ?? [];
    const already = attendees.some(
      (a) => a.email?.toLowerCase() === params.attendeeEmail.toLowerCase(),
    );
    if (already) {
      return true;
    }

    const patchRes = await fetch(`${eventUrl}?sendUpdates=externalOnly`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ attendees: [...attendees, { email: params.attendeeEmail }] }),
    });
    if (!patchRes.ok) {
      console.error('[ccw-roadshow-calendar] failed to add guest:', patchRes.status);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[ccw-roadshow-calendar] failed to add guest:', error);
    return false;
  }
}
