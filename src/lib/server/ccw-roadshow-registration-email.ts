/**
 * Pure builder for the CCW roadshow registration emails (confirmed / waitlisted
 * / promoted). No imports, so it stays trivially unit-testable; the actual send
 * lives in transactional-email.ts.
 */

export type RoadshowEmailKind = 'confirmed' | 'waitlisted' | 'promoted';

export type RegistrationEmailInput = {
  kind: RoadshowEmailKind;
  attendeeName: string;
  eventCity: string;
  dateRangeLabel: string;
  timeLabel: string;
  venueName: string;
  venueAddress: string;
  seatCount: number;
  freeEntryToken: string;
  eventPageUrl: string;
  /**
   * Pre-purchase store-credit voucher CTA. When present, the email invites the
   * attendee to pay $100 now for $100 store credit + a $50 bonus on day-1
   * sign-in ($150 total). The caller decides whether to include it (flag on +
   * purchase window open + seat-holding kind), so the builder stays pure.
   */
  voucherUrl?: string;
};

export type BuiltEmail = { subject: string; html: string; text: string };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildRegistrationEmail(input: RegistrationEmailInput): BuiltEmail {
  const {
    kind,
    attendeeName,
    eventCity,
    dateRangeLabel,
    timeLabel,
    venueName,
    venueAddress,
    seatCount,
    freeEntryToken,
    eventPageUrl,
    voucherUrl,
  } = input;

  // Confirmed money copy (owner-approved 2026-07-16): pay $100 now → $100 store
  // credit immediately + $50 bonus on day-1 sign-in = $150 total.
  const voucherHeadline = 'Lock in your seat — and get store credit';
  const voucherLine =
    'Pay $100 now for your CCW/CARSI training voucher and get $100 in store credit straight away, ' +
    'plus a $50 bonus — $150 in total — when you turn up and sign in on day one.';

  const greeting = `Hi ${attendeeName || 'there'},`;
  const seatsLabel = `${seatCount} ${seatCount === 1 ? 'seat' : 'seats'}`;
  const whenWhere = [
    `Event: CARSI x CCW Business Growth Days — ${eventCity}`,
    `When: ${dateRangeLabel}, ${timeLabel}`,
    `Where: ${venueName}, ${venueAddress}`,
    `Covers: ${seatsLabel}`,
  ].join('\n');

  let subject: string;
  let intro: string;
  let tokenBlock: string;
  let closing: string;

  if (kind === 'waitlisted') {
    subject = `You're on the waitlist — CARSI x CCW ${eventCity}`;
    intro =
      `Thanks for registering for the CARSI x CCW Business Growth Days in ${eventCity}. ` +
      `This city is currently full, so you're on the waitlist. We'll email you as soon as a seat opens up.`;
    tokenBlock =
      `Your waitlist reference is ${freeEntryToken}. ` +
      `Please note this is not yet valid for entry — wait for our confirmation before making travel plans.`;
    closing = 'We will be in touch if a place becomes available.';
  } else if (kind === 'promoted') {
    subject = `You're in! Your seat for CARSI x CCW ${eventCity} is confirmed`;
    intro =
      `Good news — a seat has opened up and your place at the CARSI x CCW Business Growth Days in ${eventCity} is now confirmed.`;
    tokenBlock =
      `Your free entry token is ${freeEntryToken}. Show this token at check-in when you arrive at the CCW location.`;
    closing = 'We look forward to seeing you there.';
  } else {
    subject = `You're confirmed — CARSI x CCW ${eventCity}`;
    intro =
      `Thanks for registering for the CARSI x CCW Business Growth Days in ${eventCity}. Your place is confirmed.`;
    tokenBlock =
      `Your free entry token is ${freeEntryToken}. Show this token at check-in when you arrive at the CCW location.`;
    closing = 'We look forward to seeing you there.';
  }

  const voucherText = voucherUrl
    ? `\n\n${voucherHeadline}\n${voucherLine}\nGet your voucher: ${voucherUrl}`
    : '';

  const text = [
    greeting,
    '',
    intro,
    '',
    whenWhere,
    '',
    tokenBlock,
    voucherText,
    '',
    `Event details: ${eventPageUrl}`,
    '',
    closing,
    '',
    'CARSI',
  ].join('\n');

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #1a1a1a; line-height: 1.6;">
      <p>${escapeHtml(greeting)}</p>
      <p>${escapeHtml(intro)}</p>
      <table style="border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 2px 12px 2px 0; color: #666;">Event</td><td>CARSI x CCW Business Growth Days — ${escapeHtml(eventCity)}</td></tr>
        <tr><td style="padding: 2px 12px 2px 0; color: #666;">When</td><td>${escapeHtml(dateRangeLabel)}, ${escapeHtml(timeLabel)}</td></tr>
        <tr><td style="padding: 2px 12px 2px 0; color: #666;">Where</td><td>${escapeHtml(venueName)}, ${escapeHtml(venueAddress)}</td></tr>
        <tr><td style="padding: 2px 12px 2px 0; color: #666;">Covers</td><td>${escapeHtml(seatsLabel)}</td></tr>
      </table>
      <p style="font-size: 15px;"><strong>${escapeHtml(tokenBlock)}</strong></p>
      ${
        voucherUrl
          ? `<div style="margin: 18px 0; padding: 16px; background: #f0f6ff; border: 1px solid #cfe0ff; border-radius: 8px;">
        <p style="margin: 0 0 6px; font-weight: 700; color: #0c3d7a;">${escapeHtml(voucherHeadline)}</p>
        <p style="margin: 0 0 12px;">${escapeHtml(voucherLine)}</p>
        <a href="${escapeHtml(voucherUrl)}" style="display: inline-block; padding: 10px 18px; background: #146fc2; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 700;">Get your voucher</a>
      </div>`
          : ''
      }
      <p><a href="${escapeHtml(eventPageUrl)}">View event details</a></p>
      <p>${escapeHtml(closing)}</p>
      <p style="color: #666;">CARSI</p>
    </div>
  `.trim();

  return { subject, html, text };
}
