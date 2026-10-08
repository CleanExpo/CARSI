import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', async () => {
  const { fakePrisma } = await import('./test-support/fake-prisma');
  return { prisma: fakePrisma };
});

const { fakeStore, resetFakeStore, seedRegistration } = await import('./test-support/fake-prisma');
const { recordCheckIn } = await import('./checkin-service');
const { listSignInsForEvent, mergeDuplicateSignIns } = await import('./admin-ops');
const OCTOBER = 'brisbane-2026-10-09';
const attendee = {
  dayIndex: 1 as const,
  fullName: 'Synthetic Attendee',
  email: 'person@example.test',
};

beforeEach(() => resetFakeStore());

describe('October attendance remains separate from historical Brisbane', () => {
  it('does not match an October sign-in to a September registration with the same email', async () => {
    seedRegistration({ eventSlug: 'brisbane', contactEmail: attendee.email });
    const result = await recordCheckIn({ ...attendee, eventSlug: OCTOBER });
    expect(result).toMatchObject({
      status: 'checked_in',
      isWalkIn: true,
      reconciledRegistration: false,
    });
    expect(fakeStore.signIns[0]).toMatchObject({ eventSlug: OCTOBER, registrationId: null });
  });

  it('matches the correct occurrence when both registrations share an email', async () => {
    seedRegistration({ eventSlug: 'brisbane', contactEmail: attendee.email });
    const october = seedRegistration({ eventSlug: OCTOBER, contactEmail: attendee.email });
    await recordCheckIn({ ...attendee, eventSlug: OCTOBER });
    expect(fakeStore.signIns[0]).toMatchObject({ registrationId: october.id, isWalkIn: false });
  });

  it('ignores September seats and walk-ins when assessing October capacity', async () => {
    seedRegistration({ eventSlug: 'brisbane', contactEmail: 'past@example.test', seatCount: 15 });
    await recordCheckIn({ ...attendee, eventSlug: 'brisbane', email: 'past@example.test' });
    const before = structuredClone(fakeStore.signIns);
    const result = await recordCheckIn({ ...attendee, eventSlug: OCTOBER });
    expect(result.status).toBe('checked_in');
    expect(fakeStore.signIns[0]).toEqual(before[0]);
  });

  it('enforces October fifteen-seat capacity without creating another sign-in', async () => {
    seedRegistration({ eventSlug: OCTOBER, contactEmail: 'reserved@example.test', seatCount: 15 });
    expect(await recordCheckIn({ ...attendee, eventSlug: OCTOBER })).toEqual({
      status: 'at_capacity',
      capacity: 15,
    });
    expect(fakeStore.signIns).toHaveLength(0);
  });

  it('keeps same-email attendance independent, rejects a cross-occurrence merge and isolates rosters', async () => {
    const september = await recordCheckIn({ ...attendee, eventSlug: 'brisbane' });
    const historical = structuredClone(fakeStore.signIns[0]);
    const october = await recordCheckIn({ ...attendee, eventSlug: OCTOBER, dayIndex: 2 });
    expect(september.status).toBe('checked_in');
    expect(october.status).toBe('checked_in');
    if (september.status !== 'checked_in' || october.status !== 'checked_in')
      throw new Error('Synthetic fixture failed');
    const beforeMerge = structuredClone(fakeStore.signIns);
    expect(
      await mergeDuplicateSignIns({ primaryId: september.signInId, duplicateId: october.signInId })
    ).toEqual({ status: 'different_event' });
    expect(fakeStore.signIns).toEqual(beforeMerge);
    expect(fakeStore.signIns[0]).toEqual(historical);
    expect((await listSignInsForEvent(OCTOBER)).rows.map((row) => row.signInId)).toEqual([
      october.signInId,
    ]);
    expect((await listSignInsForEvent('brisbane')).rows.map((row) => row.signInId)).toEqual([
      september.signInId,
    ]);
  });
});
