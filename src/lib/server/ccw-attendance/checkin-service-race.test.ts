import { beforeEach, describe, expect, it, vi } from 'vitest';

const { runSerializable } = vi.hoisted(() => ({ runSerializable: vi.fn() }));

vi.mock('@/lib/server/db-tx', () => ({ runSerializable }));

const { recordCheckIn } = await import('./checkin-service');

const sameEmailConstraintError = {
  code: 'P2002',
  meta: {
    modelName: 'CcwRoadshowSignIn',
    driverAdapterError: {
      cause: {
        originalCode: '23505',
        kind: 'UniqueConstraintViolation',
        constraint: { fields: ['event_slug', 'normalized_email'] },
      },
    },
  },
};

beforeEach(() => {
  runSerializable.mockReset();
});

describe('recordCheckIn — concurrent unique-email replay', () => {
  it('replays once after the exact event/email uniqueness race', async () => {
    let existing: {
      id: string;
      normalizedName: string;
      fullName: string;
      day1CheckedInAt: Date;
      day2CheckedInAt: null;
      isWalkIn: true;
    } | null = null;
    const tx = {
      ccwRoadshowSignIn: {
        findUnique: vi.fn(async () => existing),
        count: vi.fn(async () => 0),
        create: vi.fn(async () => {
          existing = {
            id: 'competing-sign-in',
            normalizedName: 'ann jones',
            fullName: 'Ann Jones',
            day1CheckedInAt: new Date(),
            day2CheckedInAt: null,
            isWalkIn: true,
          };
          throw sameEmailConstraintError;
        }),
      },
      ccwRoadshowRegistration: {
        aggregate: vi.fn(async () => ({ _sum: { seatCount: 0 } })),
        findMany: vi.fn(async () => []),
      },
    };
    runSerializable.mockImplementation(
      async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx),
    );

    await expect(
      recordCheckIn({
        eventSlug: 'melbourne',
        dayIndex: 1,
        fullName: 'Ann Jones',
        email: 'ann@example.invalid',
      }),
    ).resolves.toMatchObject({ status: 'already_checked_in', signInId: 'competing-sign-in' });
    expect(runSerializable).toHaveBeenCalledTimes(2);
    expect(tx.ccwRoadshowSignIn.findUnique).toHaveBeenCalledTimes(2);
    expect(tx.ccwRoadshowSignIn.create).toHaveBeenCalledTimes(1);
  });

  it('does not replay or mask a P2002 from another sign-in constraint', async () => {
    const enrollmentConstraintError = {
      ...sameEmailConstraintError,
      meta: {
        ...sameEmailConstraintError.meta,
        driverAdapterError: {
          cause: {
            ...sameEmailConstraintError.meta.driverAdapterError.cause,
            constraint: { fields: ['enrollment_id'] },
          },
        },
      },
    };
    runSerializable.mockRejectedValueOnce(enrollmentConstraintError);

    await expect(
      recordCheckIn({
        eventSlug: 'melbourne',
        dayIndex: 1,
        fullName: 'Ann Jones',
        email: 'ann@example.invalid',
      }),
    ).rejects.toBe(enrollmentConstraintError);
    expect(runSerializable).toHaveBeenCalledTimes(1);
  });
});
