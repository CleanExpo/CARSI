import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Admin ops exercised against the in-memory fake Prisma. There is NO append-only
 * ledger (this course grants no CECs) — the day columns are the write-once source
 * of truth. Covers:
 *  - correction = direct, write-once-respecting CLEAR of a day mark;
 *  - merge-duplicates backfills the survivor (no attendance mark lost);
 *  - paper digitisation via the same writer (source='paper');
 *  - roster is single-event-scoped and derives from the day columns
 *    (attendanceComplete = both days, the certificate-of-attendance trigger).
 */
vi.mock('@/lib/prisma', async () => {
  const m = await import('./test-support/fake-prisma');
  return { prisma: m.fakePrisma };
});

const { fakeStore, resetFakeStore } = await import('./test-support/fake-prisma');
const { recordCheckIn } = await import('./checkin-service');
const {
  applyCheckInCorrection,
  mergeDuplicateSignIns,
  digitisePaperCheckIn,
  listSignInsForEvent,
} = await import('./admin-ops');

beforeEach(() => {
  resetFakeStore();
});

async function seedSignIn(email: string, day: 1 | 2, fullName = 'Ann Jones'): Promise<string> {
  const r = await recordCheckIn({ eventSlug: 'melbourne', dayIndex: day, fullName, email });
  if (r.status !== 'checked_in') throw new Error(`seed failed: ${r.status}`);
  return r.signInId;
}

describe('applyCheckInCorrection — direct write-once-respecting clear', () => {
  it('clears the mistaken day mark directly (no ledger, nothing else mutated)', async () => {
    const id = await seedSignIn('ann@x.com', 1);
    expect(fakeStore.signIns[0].day1CheckedInAt).not.toBeNull();

    const result = await applyCheckInCorrection({ signInId: id, dayIndex: 1, reason: 'wrong person', actorAdminEmail: 'admin@carsi' });
    expect(result.status).toBe('corrected');
    if (result.status === 'corrected') expect(result.day1CheckedInAt).toBeNull();

    // The day column was cleared in place; the row still exists.
    expect(fakeStore.signIns).toHaveLength(1);
    expect(fakeStore.signIns[0].day1CheckedInAt).toBeNull();
  });

  it('a re-check-in after a correction restores presence (set-if-null again)', async () => {
    const id = await seedSignIn('ann@x.com', 1);
    await applyCheckInCorrection({ signInId: id, dayIndex: 1, reason: 'oops' });
    expect(fakeStore.signIns[0].day1CheckedInAt).toBeNull();

    await recordCheckIn({ eventSlug: 'melbourne', dayIndex: 1, fullName: 'Ann Jones', email: 'ann@x.com' });
    expect(fakeStore.signIns[0].day1CheckedInAt).not.toBeNull();
    expect(fakeStore.signIns).toHaveLength(1);
  });

  it('rejects a blank reason and a missing sign-in', async () => {
    const id = await seedSignIn('ann@x.com', 1);
    expect((await applyCheckInCorrection({ signInId: id, dayIndex: 1, reason: '   ' })).status).toBe('invalid_reason');
    expect((await applyCheckInCorrection({ signInId: 'missing', dayIndex: 1, reason: 'x' })).status).toBe('not_found');
  });
});

describe('mergeDuplicateSignIns — backfill survivor, lose no attendance mark', () => {
  it('merges a typo-duplicate into the primary, backfilling the missing day', async () => {
    const primary = await seedSignIn('ann@x.com', 1, 'Ann Jones'); // Day-1
    const duplicate = await seedSignIn('ann2@x.com', 2, 'Ann Jones'); // typo email, Day-2
    expect(fakeStore.signIns).toHaveLength(2);

    const result = await mergeDuplicateSignIns({ primaryId: primary, duplicateId: duplicate, actorAdminEmail: 'admin@carsi' });
    expect(result.status).toBe('merged');
    if (result.status === 'merged') {
      expect(result.primaryId).toBe(primary);
      expect(result.day1CheckedInAt).not.toBeNull();
      expect(result.day2CheckedInAt).not.toBeNull();
    }

    // Duplicate removed; survivor now holds BOTH days.
    expect(fakeStore.signIns).toHaveLength(1);
    expect(fakeStore.signIns[0].id).toBe(primary);
    expect(fakeStore.signIns[0].day1CheckedInAt).not.toBeNull();
    expect(fakeStore.signIns[0].day2CheckedInAt).not.toBeNull();
  });

  it('rejects same-row, missing, and cross-event merges', async () => {
    const a = await seedSignIn('a@x.com', 1);
    expect((await mergeDuplicateSignIns({ primaryId: a, duplicateId: a })).status).toBe('same_row');
    expect((await mergeDuplicateSignIns({ primaryId: a, duplicateId: 'missing' })).status).toBe('not_found');

    const syd = await recordCheckIn({ eventSlug: 'sydney', dayIndex: 1, fullName: 'S', email: 's@x.com' });
    if (syd.status !== 'checked_in') throw new Error('seed');
    expect((await mergeDuplicateSignIns({ primaryId: a, duplicateId: syd.signInId })).status).toBe('different_event');
  });
});

describe('digitisePaperCheckIn — same writer, source=paper', () => {
  it('records an offline entry through recordCheckIn, attributing the admin', async () => {
    const r = await digitisePaperCheckIn({ eventSlug: 'melbourne', dayIndex: 1, fullName: 'Paper Person', email: 'paper@x.com', actorAdminId: 'admin-1' });
    expect(r.status).toBe('checked_in');
    expect(fakeStore.signIns).toHaveLength(1);
    expect(fakeStore.signIns[0].day1CheckedInAt).not.toBeNull();
    // A non-self source records the acting admin on the row.
    expect(fakeStore.signIns[0].signedInByAdmin).toBe('admin-1');
  });
});

describe('listSignInsForEvent — single-event roster derived from day columns', () => {
  it('scopes to one event and marks attendanceComplete when both days are present', async () => {
    // Both-days person in Melbourne → attendanceComplete.
    await recordCheckIn({ eventSlug: 'melbourne', dayIndex: 1, fullName: 'Both Days', email: 'both@x.com' });
    await recordCheckIn({ eventSlug: 'melbourne', dayIndex: 2, fullName: 'Both Days', email: 'both@x.com' });
    // A different event — must NOT appear.
    await recordCheckIn({ eventSlug: 'sydney', dayIndex: 1, fullName: 'Other', email: 'other@x.com' });

    const roster = await listSignInsForEvent('melbourne');
    expect(roster.eventSlug).toBe('melbourne');
    expect(roster.courseSlug).toBe('ccw-2-day-workshop');
    expect(roster.rows).toHaveLength(1);
    const row = roster.rows[0];
    expect(row.email).toBe('both@x.com');
    expect(row.day1CheckedInAt).not.toBeNull();
    expect(row.day2CheckedInAt).not.toBeNull();
    expect(row.attendanceComplete).toBe(true);
    // No CEC/IICRC fields leak onto the roster row.
    expect(row).not.toHaveProperty('cecEligible');
    expect(row).not.toHaveProperty('iicrcRegNumber');
  });

  it('a single-day attendee is NOT attendanceComplete', async () => {
    await recordCheckIn({ eventSlug: 'melbourne', dayIndex: 1, fullName: 'One Day', email: 'one@x.com' });
    const roster = await listSignInsForEvent('melbourne');
    expect(roster.rows).toHaveLength(1);
    expect(roster.rows[0].attendanceComplete).toBe(false);
  });
});
