import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  updateMany: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: { lmsUser: { updateMany: mocks.updateMany } },
}));

const { markEmailVerified } = await import('@/lib/server/lms-auth');

beforeEach(() => {
  mocks.updateMany.mockReset();
  mocks.updateMany.mockResolvedValue({ count: 1 });
});

describe('markEmailVerified (GP-699)', () => {
  it('only matches an active account that still has the address the link was issued for', async () => {
    await expect(markEmailVerified('user-1', '  Student@Example.Test ')).resolves.toBe(true);

    expect(mocks.updateMany).toHaveBeenCalledTimes(1);
    // Exact match on purpose: dropping the id, the address or the active flag
    // from the filter must fail this test.
    expect(mocks.updateMany.mock.calls[0][0]).toEqual({
      where: { id: 'user-1', email: 'student@example.test', isActive: true },
      data: { isVerified: true },
    });
  });

  it('reports false when no row matched, so the caller never claims a confirmation', async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });

    await expect(markEmailVerified('user-1', 'student@example.test')).resolves.toBe(false);
  });

  it('writes nothing when the user id or the address is empty', async () => {
    await expect(markEmailVerified('', 'student@example.test')).resolves.toBe(false);
    await expect(markEmailVerified('user-1', '   ')).resolves.toBe(false);

    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it('lets a database error reach the caller instead of reporting success', async () => {
    mocks.updateMany.mockRejectedValue(new Error('db down'));

    await expect(markEmailVerified('user-1', 'student@example.test')).rejects.toThrow('db down');
  });
});
