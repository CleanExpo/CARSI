/**
 * Regression tests for the silent-email-failure bug.
 *
 * The original defect: `sendEmail()` signals failure by RETURNING
 * `{ sent: false, reason }` instead of throwing. Callers wrapped the send in
 * try/catch and discarded the return value, so a failed send produced no error,
 * no record, and a success response. These tests pin the fix: every attempt is
 * classified and logged, and the caller gets the true outcome back.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendMock = vi.fn();
const createMock = vi.fn();
const findManyMock = vi.fn();

vi.mock('@/lib/server/transactional-email', () => ({
  sendCcwRoadshowRegistrationEmail: (...args: unknown[]) => sendMock(...args),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    ccwRoadshowEmailLog: {
      create: (...args: unknown[]) => createMock(...args),
      findMany: (...args: unknown[]) => findManyMock(...args),
    },
  },
}));

const { sendAndLogRoadshowEmail, getEmailStatusByRegistration } = await import(
  './ccw-roadshow-email-log'
);

const base = {
  registrationId: 'reg-1',
  to: 'attendee@example.com',
  kind: 'promoted' as const,
  attendeeName: 'Harjot',
  eventCity: 'Melbourne',
  dateRangeLabel: 'Wednesday 22 July - Thursday 23 July 2026',
  timeLabel: '8.30am-4.30pm both days',
  venueName: 'Club Kilsyth',
  venueAddress: '1 Example St, Bayswater North VIC 3153',
  seatCount: 1,
  freeEntryToken: 'CCW-FREE-XYZ',
  appOrigin: 'https://carsi.com.au',
};

describe('sendAndLogRoadshowEmail', () => {
  beforeEach(() => {
    sendMock.mockReset();
    createMock.mockReset();
    createMock.mockResolvedValue({});
  });

  it('records a successful send with the provider message id', async () => {
    sendMock.mockResolvedValue({ sent: true, messageId: 'mt-123' });

    const out = await sendAndLogRoadshowEmail(base);

    expect(out.sent).toBe(true);
    expect(out.providerMessageId).toBe('mt-123');
    const data = createMock.mock.calls[0][0].data;
    expect(data.deliveryStatus).toBe('sent');
    expect(data.providerMessageId).toBe('mt-123');
    expect(data.sentAt).toBeInstanceOf(Date);
    expect(data.failureReason).toBeNull();
  });

  // THE BUG: this path used to return silently with nothing recorded.
  it('catches a provider_error that does NOT throw, and logs it as failed', async () => {
    sendMock.mockResolvedValue({ sent: false, reason: 'provider_error' });

    const out = await sendAndLogRoadshowEmail(base);

    expect(out.sent).toBe(false);
    expect(out.reason).toBe('provider_error');
    const data = createMock.mock.calls[0][0].data;
    expect(data.deliveryStatus).toBe('failed');
    expect(data.failureReason).toBe('provider_error');
    expect(data.sentAt).toBeNull();
  });

  // THE BUG: a missing MAILTRAP_API_KEY returned { sent:false } with no throw.
  it('catches not_configured and logs it as failed', async () => {
    sendMock.mockResolvedValue({ sent: false, reason: 'not_configured' });

    const out = await sendAndLogRoadshowEmail(base);

    expect(out.sent).toBe(false);
    expect(createMock.mock.calls[0][0].data.deliveryStatus).toBe('failed');
  });

  it('treats dev_console as skipped, not a failure', async () => {
    sendMock.mockResolvedValue({ sent: true, reason: 'dev_console' });

    const out = await sendAndLogRoadshowEmail(base);

    expect(out.sent).toBe(true);
    expect(createMock.mock.calls[0][0].data.deliveryStatus).toBe('skipped');
  });

  it('never throws when the send itself throws — it records and returns', async () => {
    sendMock.mockRejectedValue(new Error('socket hang up'));

    const out = await sendAndLogRoadshowEmail(base);

    expect(out.sent).toBe(false);
    expect(out.reason).toContain('socket hang up');
    expect(createMock.mock.calls[0][0].data.deliveryStatus).toBe('failed');
  });

  it('never lets a logging failure break the caller', async () => {
    sendMock.mockResolvedValue({ sent: true, messageId: 'mt-9' });
    createMock.mockRejectedValue(new Error('db down'));

    await expect(sendAndLogRoadshowEmail(base)).resolves.toMatchObject({ sent: true });
  });
});

describe('getEmailStatusByRegistration', () => {
  beforeEach(() => {
    findManyMock.mockReset();
  });

  it('returns an empty map for no ids without querying', async () => {
    const map = await getEmailStatusByRegistration([]);
    expect(map.size).toBe(0);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it('reports the latest attempt but remembers an earlier success', async () => {
    // newest first, as the query orders
    findManyMock.mockResolvedValue([
      {
        registrationId: 'reg-1',
        kind: 'promoted',
        deliveryStatus: 'failed',
        failureReason: 'provider_error',
        createdAt: new Date('2026-07-16T02:00:00Z'),
      },
      {
        registrationId: 'reg-1',
        kind: 'confirmed',
        deliveryStatus: 'sent',
        failureReason: null,
        createdAt: new Date('2026-07-15T02:00:00Z'),
      },
    ]);

    const map = await getEmailStatusByRegistration(['reg-1']);
    const s = map.get('reg-1')!;

    expect(s.lastStatus).toBe('failed');
    expect(s.lastKind).toBe('promoted');
    expect(s.failureReason).toBe('provider_error');
    // they DID get the earlier confirmed email, even though the latest failed
    expect(s.everSent).toBe(true);
  });

  it('omits registrations with no attempts (= never emailed)', async () => {
    findManyMock.mockResolvedValue([]);
    const map = await getEmailStatusByRegistration(['reg-1', 'reg-2']);
    expect(map.get('reg-1')).toBeUndefined();
    expect(map.get('reg-2')).toBeUndefined();
  });
});
