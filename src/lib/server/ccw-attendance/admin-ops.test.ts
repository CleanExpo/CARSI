import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Admin ops exercised against the in-memory fake Prisma. Covers AC#15:
 *  (c) correction = APPEND reversal + recompute, history never deleted;
 *  (4) merge-duplicates re-parents ledger onto the survivor (no fact lost);
 *  (8) paper digitisation via the same writer (source='paper');
 *  roster is single-event-scoped and ledger-derived.
 */
vi.mock('@/lib/prisma', async () => {
  const m = await import('./test-support/fake-prisma');
  return { prisma: m.fakePrisma };
});

const { fakeStore, resetFakeStore, seedCourse } = await import('./test-support/fake-prisma');
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

describe('applyCheckInCorrection (AC c) — reversal appended, history preserved', () => {
  it('appends a reversal row + recomputes the derived cache to absent, deleting nothing', async () => {
    const id = await seedSignIn('ann@x.com', 1);
    expect(fakeStore.events).toHaveLength(1); // the checkin

    const result = await applyCheckInCorrection({ signInId: id, dayIndex: 1, reason: 'wrong person', actorAdminEmail: 'admin@carsi' });
    expect(result.status).toBe('corrected');
    if (result.status === 'corrected') expect(result.day1CheckedInAt).toBeNull();

    // History intact: the original checkin AND the new reversal both exist.
    expect(fakeStore.events).toHaveLength(2);
    expect(fakeStore.events.map((e) => e.action).sort()).toEqual(['checkin', 'reversal']);
    // Derived cache on the row recomputed to null.
    expect(fakeStore.signIns[0].day1CheckedInAt).toBeNull();
    // Reason carries the admin trail.
    expect(fakeStore.events.find((e) => e.action === 'reversal')?.reason).toContain('admin@carsi');
  });

  it('a re-check-in after a reversal restores presence (replay, no mutation)', async () => {
    const id = await seedSignIn('ann@x.com', 1);
    await applyCheckInCorrection({ signInId: id, dayIndex: 1, reason: 'oops' });
    expect(fakeStore.signIns[0].day1CheckedInAt).toBeNull();

    await recordCheckIn({ eventSlug: 'melbourne', dayIndex: 1, fullName: 'Ann Jones', email: 'ann@x.com' });
    expect(fakeStore.signIns[0].day1CheckedInAt).not.toBeNull();
    // checkin, reversal, checkin — three immutable rows.
    expect(fakeStore.events).toHaveLength(3);
  });

  it('rejects a blank reason and a missing sign-in', async () => {
    const id = await seedSignIn('ann@x.com', 1);
    expect((await applyCheckInCorrection({ signInId: id, dayIndex: 1, reason: '   ' })).status).toBe('invalid_reason');
    expect((await applyCheckInCorrection({ signInId: 'missing', dayIndex: 1, reason: 'x' })).status).toBe('not_found');
  });
});

describe('mergeDuplicateSignIns (AC 4) — re-parent ledger, lose no fact', () => {
  it('merges a typo-duplicate into the primary and recomputes from the combined ledger', async () => {
    const primary = await seedSignIn('ann@x.com', 1, 'Ann Jones');
    const duplicate = await seedSignIn('ann2@x.com', 2, 'Ann Jones'); // typo email, Day-2
    expect(fakeStore.signIns).toHaveLength(2);

    const result = await mergeDuplicateSignIns({ primaryId: primary, duplicateId: duplicate, actorAdminEmail: 'admin@carsi' });
    expect(result.status).toBe('merged');
    if (result.status === 'merged') {
      expect(result.movedEvents).toBe(1);
      expect(result.day1CheckedInAt).not.toBeNull();
      expect(result.day2CheckedInAt).not.toBeNull();
    }

    // Duplicate row removed; survivor holds BOTH days; no ledger row lost.
    expect(fakeStore.signIns).toHaveLength(1);
    expect(fakeStore.signIns[0].id).toBe(primary);
    expect(fakeStore.events).toHaveLength(2);
    expect(fakeStore.events.every((e) => e.signInId === primary)).toBe(true);
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

describe('digitisePaperCheckIn (AC 8) — same writer, source=paper', () => {
  it('records an offline entry through recordCheckIn tagged paper', async () => {
    const r = await digitisePaperCheckIn({ eventSlug: 'melbourne', dayIndex: 1, fullName: 'Paper Person', email: 'paper@x.com', actorAdminId: null });
    expect(r.status).toBe('checked_in');
    expect(fakeStore.events).toHaveLength(1);
    expect(fakeStore.events[0].source).toBe('paper');
  });
});

describe('listSignInsForEvent — single-event, ledger-derived roster', () => {
  it('scopes to one event and derives CEC eligibility from the seeded course', async () => {
    seedCourse('ccw-2-day-workshop', 4);
    // Both-days + IICRC person in Melbourne.
    await recordCheckIn({ eventSlug: 'melbourne', dayIndex: 1, fullName: 'Cec Person', email: 'cec@x.com', iicrcRegNumber: 'IICRC-9' });
    await recordCheckIn({ eventSlug: 'melbourne', dayIndex: 2, fullName: 'Cec Person', email: 'cec@x.com', iicrcRegNumber: 'IICRC-9' });
    // A different event — must NOT appear.
    await recordCheckIn({ eventSlug: 'sydney', dayIndex: 1, fullName: 'Other', email: 'other@x.com' });

    const roster = await listSignInsForEvent('melbourne');
    expect(roster.eventSlug).toBe('melbourne');
    expect(roster.courseCecHours).toBe(4);
    expect(roster.rows).toHaveLength(1);
    const row = roster.rows[0];
    expect(row.email).toBe('cec@x.com');
    expect(row.day1CheckedInAt).not.toBeNull();
    expect(row.day2CheckedInAt).not.toBeNull();
    expect(row.cecEligible).toBe(true);
    expect(row.iicrcRegNumber).toBe('IICRC-9');
  });
});
