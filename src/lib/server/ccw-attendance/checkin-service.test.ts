import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Capture service exercised against an in-memory fake Prisma (real SERIALIZABLE
 * `$transaction`, real write-once + capacity + ledger logic).
 * Covers AC#15 (b) write-once day marks, (f) email-collision refused/no-collapse,
 * (g) walk-in consumes capacity + refused at cap.
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

describe('recordCheckIn — new person + write-once day marks (AC b)', () => {
  it('creates a walk-in sign-in + one checkin ledger row on first Day-1 tap', async () => {
    const r = await recordCheckIn({ eventSlug: 'melbourne', dayIndex: 1, fullName: 'Ann Jones', email: 'ann@x.com' });
    expect(r.status).toBe('checked_in');
    expect(fakeStore.signIns).toHaveLength(1);
    expect(fakeStore.signIns[0].isWalkIn).toBe(true);
    expect(fakeStore.signIns[0].day1CheckedInAt).not.toBeNull();
    expect(fakeStore.events.filter((e) => e.action === 'checkin')).toHaveLength(1);
  });

  it('a second Day-1 tap is idempotent — already_checked_in, no duplicate ledger row', async () => {
    await recordCheckIn({ eventSlug: 'melbourne', dayIndex: 1, fullName: 'Ann Jones', email: 'ann@x.com' });
    const firstMark = fakeStore.signIns[0].day1CheckedInAt;
    const r = await recordCheckIn({ eventSlug: 'melbourne', dayIndex: 1, fullName: 'Ann Jones', email: 'ann@x.com' });
    expect(r.status).toBe('already_checked_in');
    expect(fakeStore.signIns[0].day1CheckedInAt).toEqual(firstMark); // unchanged (write-once)
    expect(fakeStore.events.filter((e) => e.action === 'checkin')).toHaveLength(1);
  });

  it('Day-2 tap on the same person marks day2 and appends a second ledger row', async () => {
    await recordCheckIn({ eventSlug: 'melbourne', dayIndex: 1, fullName: 'Ann Jones', email: 'ann@x.com' });
    const r = await recordCheckIn({ eventSlug: 'melbourne', dayIndex: 2, fullName: 'Ann Jones', email: 'ann@x.com' });
    expect(r.status).toBe('checked_in');
    expect(fakeStore.signIns).toHaveLength(1);
    expect(fakeStore.signIns[0].day2CheckedInAt).not.toBeNull();
    expect(fakeStore.events.filter((e) => e.action === 'checkin')).toHaveLength(2);
  });
});

describe('recordCheckIn — unique-email collision (AC f)', () => {
  it('refuses a different name on the same email; never collapses or overwrites', async () => {
    await recordCheckIn({ eventSlug: 'melbourne', dayIndex: 1, fullName: 'Ann Jones', email: 'shared@x.com' });
    const r = await recordCheckIn({ eventSlug: 'melbourne', dayIndex: 1, fullName: 'Bob Smith', email: 'shared@x.com' });
    expect(r.status).toBe('email_collision_different_name');
    expect(fakeStore.signIns).toHaveLength(1);
    expect(fakeStore.signIns[0].fullName).toBe('Ann Jones'); // original NOT overwritten
  });
});

describe('recordCheckIn — walk-ins consume capacity (AC g)', () => {
  it('refuses a walk-in once confirmed seats reach the cap (Sydney cap 12)', async () => {
    seedRegistration({ eventSlug: 'sydney', contactEmail: 'reg@x.com', seatCount: 12, status: 'confirmed' });
    const r = await recordCheckIn({ eventSlug: 'sydney', dayIndex: 1, fullName: 'Walk In', email: 'walk@x.com' });
    expect(r.status).toBe('at_capacity');
    if (r.status === 'at_capacity') expect(r.capacity).toBe(12);
    expect(fakeStore.signIns).toHaveLength(0);
  });

  it('a reconciled (registered) attendee is NOT capacity-checked even at cap', async () => {
    seedRegistration({ eventSlug: 'sydney', contactEmail: 'reg@x.com', seatCount: 12, status: 'confirmed' });
    const r = await recordCheckIn({ eventSlug: 'sydney', dayIndex: 1, fullName: 'Reg Person', email: 'reg@x.com' });
    expect(r.status).toBe('checked_in');
    expect(fakeStore.signIns).toHaveLength(1);
    expect(fakeStore.signIns[0].isWalkIn).toBe(false);
    expect(fakeStore.signIns[0].registrationId).not.toBeNull();
  });
});

describe('recordCheckIn — unknown event', () => {
  it('returns invalid_event for an unrecognised slug', async () => {
    const r = await recordCheckIn({ eventSlug: 'nope', dayIndex: 1, fullName: 'X', email: 'x@x.com' });
    expect(r.status).toBe('invalid_event');
  });
});
