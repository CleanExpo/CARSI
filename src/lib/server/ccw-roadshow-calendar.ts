import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'phill.mcgurk@gmail.com';

function getOAuthClient(): OAuth2Client | null {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_CALENDAR_OAUTH_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const client = new google.auth.OAuth2(clientId, clientSecret);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

export async function addRegistrationToCalendar(params: {
  calendarEventId: string;
  attendeeEmail: string;
}): Promise<boolean> {
  const auth = getOAuthClient();
  if (!auth) {
    console.warn('[ccw-roadshow-calendar] Google Calendar credentials absent — skipping sync.');
    return false;
  }

  try {
    const calendar = google.calendar({ version: 'v3', auth });

    const existing = await calendar.events.get({
      calendarId: CALENDAR_ID,
      eventId: params.calendarEventId,
    });

    const attendees = existing.data.attendees ?? [];
    const already = attendees.some(
      (a) => a.email?.toLowerCase() === params.attendeeEmail.toLowerCase(),
    );
    if (already) {
      return true;
    }

    await calendar.events.patch({
      calendarId: CALENDAR_ID,
      eventId: params.calendarEventId,
      sendUpdates: 'externalOnly',
      requestBody: {
        attendees: [...attendees, { email: params.attendeeEmail }],
      },
    });

    return true;
  } catch (error) {
    console.error('[ccw-roadshow-calendar] failed to add guest:', error);
    return false;
  }
}
