import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Capture service exercised against an in-memory fake Prisma (real SERIALIZABLE
 * `$transaction`, real write-once + capacity logic). There is NO check-in ledger
 * anymore — the day columns are the write-once source of truth.
 * Covers write-once day marks, email-collision refused/no-collapse,
 * walk-in consumes capacity + refused at cap.
 */
vi.mock('@/lib/prisma', async () => {
  const m = await import('./test-support/fake-prisma');
  return { prisma: m.fakePrisma };
});

const { fakeStore, resetFakeStore, seedRegistration } = await import('./test-support/fake-prisma');
const { recordCheckIn } = await import('./checkin-service');

beforeEach(() => {
  resetFakeStore();
});

describe('recordCheckIn — new person + write-once day marks', () => {
  it('creates a walk-in sign-in and stamps day1 on the first Day-1 tap', async () => {
    const r = await recordCheckIn({
      eventSlug: 'melbourne',
      dayIndex: 1,
      fullName: 'Ann Jones',
      email: 'ann@x.com',
    });
    expect(r.status).toBe('checked_in');
    expect(fakeStore.signIns).toHaveLength(1);
    expect(fakeStore.signIns[0].isWalkIn).toBe(true);
    expect(fakeStore.signIns[0].day1CheckedInAt).not.toBeNull();
  });

  it('a second Day-1 tap is idempotent — already_checked_in, day mark unchanged (write-once)', async () => {
    await recordCheckIn({
      eventSlug: 'melbourne',
      dayIndex: 1,
      fullName: 'Ann Jones',
      email: 'ann@x.com',
    });
    const firstMark = fakeStore.signIns[0].day1CheckedInAt;
    const r = await recordCheckIn({
      eventSlug: 'melbourne',
      dayIndex: 1,
      fullName: 'Ann Jones',
      email: 'ann@x.com',
    });
    expect(r.status).toBe('already_checked_in');
    expect(fakeStore.signIns[0].day1CheckedInAt).toEqual(firstMark); // unchanged (write-once)
    expect(fakeStore.signIns).toHaveLength(1);
  });

  it('Day-2 tap on the same person marks day2 without a second row', async () => {
    await recordCheckIn({
      eventSlug: 'melbourne',
      dayIndex: 1,
      fullName: 'Ann Jones',
      email: 'ann@x.com',
    });
    const r = await recordCheckIn({
      eventSlug: 'melbourne',
      dayIndex: 2,
      fullName: 'Ann Jones',
      email: 'ann@x.com',
    });
    expect(r.status).toBe('checked_in');
    expect(fakeStore.signIns).toHaveLength(1);
    expect(fakeStore.signIns[0].day1CheckedInAt).not.toBeNull();
    expect(fakeStore.signIns[0].day2CheckedInAt).not.toBeNull();
  });
});

describe('recordCheckIn — admin attribution on an existing row', () => {
  it('backfills a null attribution when an admin records a new day', async () => {
    await recordCheckIn({
      eventSlug: 'melbourne',
      dayIndex: 1,
      fullName: 'Ann Jones',
      email: 'ann@x.com',
      source: 'self',
    });

    await recordCheckIn({
      eventSlug: 'melbourne',
      dayIndex: 2,
      fullName: 'Ann Jones',
      email: 'ann@x.com',
      source: 'admin',
      actorAdminId: 'admin-1',
    });

    expect(fakeStore.signIns[0].signedInByAdmin).toBe('admin-1');
  });

  it('never overwrites an existing admin attribution when another admin records a new day', async () => {
    await recordCheckIn({
      eventSlug: 'melbourne',
      dayIndex: 1,
      fullName: 'Ann Jones',
      email: 'ann@x.com',
      source: 'admin',
      actorAdminId: 'admin-original',
    });

    await recordCheckIn({
      eventSlug: 'melbourne',
      dayIndex: 2,
      fullName: 'Ann Jones',
      email: 'ann@x.com',
      source: 'admin',
      actorAdminId: 'admin-later',
    });

    expect(fakeStore.signIns[0].signedInByAdmin).toBe('admin-original');
  });
});

describe('recordCheckIn — unique-email collision', () => {
  it('refuses a different name on the same email; never collapses or overwrites', async () => {
    await recordCheckIn({
      eventSlug: 'melbourne',
      dayIndex: 1,
      fullName: 'Ann Jones',
      email: 'shared@x.com',
    });
    const r = await recordCheckIn({
      eventSlug: 'melbourne',
      dayIndex: 1,
      fullName: 'Bob Smith',
      email: 'shared@x.com',
    });
    expect(r.status).toBe('email_collision_different_name');
    expect(fakeStore.signIns).toHaveLength(1);
    expect(fakeStore.signIns[0].fullName).toBe('Ann Jones'); // original NOT overwritten
  });
});

describe('recordCheckIn — walk-ins consume capacity', () => {
  it('refuses a walk-in once confirmed seats reach the cap (Sydney cap 12)', async () => {
    seedRegistration({
      eventSlug: 'sydney',
      contactEmail: 'reg@x.com',
      seatCount: 12,
      status: 'confirmed',
    });
    const r = await recordCheckIn({
      eventSlug: 'sydney',
      dayIndex: 1,
      fullName: 'Walk In',
      email: 'walk@x.com',
    });
    expect(r.status).toBe('at_capacity');
    if (r.status === 'at_capacity') expect(r.capacity).toBe(12);
    expect(fakeStore.signIns).toHaveLength(0);
  });

  it('a reconciled (registered) attendee is NOT capacity-checked even at cap', async () => {
    seedRegistration({
      eventSlug: 'sydney',
      contactEmail: 'reg@x.com',
      seatCount: 12,
      status: 'confirmed',
    });
    const r = await recordCheckIn({
      eventSlug: 'sydney',
      dayIndex: 1,
      fullName: 'Reg Person',
      email: 'reg@x.com',
    });
    expect(r.status).toBe('checked_in');
    expect(fakeStore.signIns).toHaveLength(1);
    expect(fakeStore.signIns[0].isWalkIn).toBe(false);
    expect(fakeStore.signIns[0].registrationId).not.toBeNull();
  });
});

describe('recordCheckIn — unknown event', () => {
  it('returns invalid_event for an unrecognised slug', async () => {
    const r = await recordCheckIn({
      eventSlug: 'nope',
      dayIndex: 1,
      fullName: 'X',
      email: 'x@x.com',
    });
    expect(r.status).toBe('invalid_event');
  });
});
