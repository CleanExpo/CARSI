import { describe, expect, it, vi } from 'vitest';

/**
 * GP-463 gap: quiz submission's attempt-limit guard
 * (app/api/lms/quizzes/[quizId]/attempt/route.ts) is explicitly called out in
 * its own comment as a TOCTOU race — "count()-then-create() ... concurrent
 * submissions all read the same count, all pass the check, and all insert,
 * blowing past attemptsAllowed" — and is guarded by wrapping the re-count +
 * insert inside `runSerializable` (SERIALIZABLE isolation + retry). That race
 * fix had NO test coverage. This mirrors the proven pattern in
 * team-invite-accept-race.test.ts: model Postgres SERIALIZABLE conflict
 * detection in memory, mock `@/lib/prisma` so `$transaction` runs the real
 * `runSerializable` retry logic, and prove two concurrent last-attempt
 * submissions never both get recorded past `attemptsAllowed`.
 */

interface AttemptRow {
  quizId: string;
  studentId: string;
}

/**
 * In-memory model of the two Prisma ops the route performs inside the
 * transaction — count() then create() — with SERIALIZABLE conflict detection
 * keyed on a per-quiz+student monotonic version, exactly as
 * team-invite-accept-race.test.ts models seat allocation.
 */
class SerializableAttemptStore {
  private attempts: AttemptRow[] = [];
  private versionByKey = new Map<string, number>();

  private key(quizId: string, studentId: string): string {
    return `${quizId}:${studentId}`;
  }

  count(quizId: string, studentId: string): number {
    return this.attempts.filter((a) => a.quizId === quizId && a.studentId === studentId).length;
  }

  version(quizId: string, studentId: string): number {
    return this.versionByKey.get(this.key(quizId, studentId)) ?? 0;
  }

  /** Seed committed prior attempts without race semantics (test setup). */
  seed(row: AttemptRow): void {
    this.attempts.push(row);
    const k = this.key(row.quizId, row.studentId);
    this.versionByKey.set(k, this.version(row.quizId, row.studentId) + 1);
  }

  /** Commit an insert observed at `readVersion`; throws P2034 on a stale read. */
  commitInsert(row: AttemptRow, readVersion: number): void {
    const k = this.key(row.quizId, row.studentId);
    if (this.version(row.quizId, row.studentId) !== readVersion) {
      throw { code: 'P2034', message: 'could not serialize access due to read/write dependencies' };
    }
    this.attempts.push(row);
    this.versionByKey.set(k, readVersion + 1);
  }
}

function makeBarrier(n: number) {
  let arrived = 0;
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  return async () => {
    arrived += 1;
    if (arrived >= n) release();
    await gate;
  };
}

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
  },
}));

const { runSerializable } = await import('./db-tx');

/**
 * The attempt-limit guard exactly as the route runs it (attempt/route.ts:73-90):
 * re-read attemptsUsed inside the transaction, reject when the cap is reached,
 * else record. `barrier` forces two racers to interleave their reads before
 * either commits, reproducing the concurrency the SERIALIZABLE fix defends.
 */
async function submitAttempt(
  store: SerializableAttemptStore,
  params: { quizId: string; studentId: string; attemptsAllowed: number },
  barrier?: () => Promise<void>,
): Promise<{ limitReached: boolean }> {
  return runSerializable(async () => {
    const { quizId, studentId, attemptsAllowed } = params;
    const readVersion = store.version(quizId, studentId);
    const attemptsUsed = store.count(quizId, studentId);

    if (attemptsUsed >= attemptsAllowed) {
      return { limitReached: true };
    }

    if (barrier) await barrier();

    store.commitInsert({ quizId, studentId }, readVersion);
    return { limitReached: false };
  });
}

describe('quiz attempt-limit race (attempt/route.ts SERIALIZABLE guard)', () => {
  it('rejects the (attemptsAllowed+1)th concurrent submission and never exceeds the cap', async () => {
    const store = new SerializableAttemptStore();
    const quizId = 'quiz-1';
    const studentId = 'student-1';
    const attemptsAllowed = 2;

    store.seed({ quizId, studentId }); // 1 used, 1 remaining

    const barrier = makeBarrier(2);
    const results = await Promise.all([
      submitAttempt(store, { quizId, studentId, attemptsAllowed }, barrier),
      submitAttempt(store, { quizId, studentId, attemptsAllowed }, barrier),
    ]);

    const succeeded = results.filter((r) => !r.limitReached).length;
    const rejected = results.filter((r) => r.limitReached).length;

    expect(succeeded).toBe(1);
    expect(rejected).toBe(1);
    // The invariant the fix exists to protect: never more recorded attempts
    // than attemptsAllowed, even under concurrent last-attempt submissions.
    expect(store.count(quizId, studentId)).toBe(attemptsAllowed);
    expect(store.count(quizId, studentId)).toBeLessThanOrEqual(attemptsAllowed);
  });

  it('lets both concurrent submissions through when two attempts remain', async () => {
    const store = new SerializableAttemptStore();
    const quizId = 'quiz-2';
    const studentId = 'student-1';
    const attemptsAllowed = 3;

    store.seed({ quizId, studentId }); // 1 used, 2 remaining

    const barrier = makeBarrier(2);
    const results = await Promise.all([
      submitAttempt(store, { quizId, studentId, attemptsAllowed }, barrier),
      submitAttempt(store, { quizId, studentId, attemptsAllowed }, barrier),
    ]);

    expect(results.every((r) => !r.limitReached)).toBe(true);
    expect(store.count(quizId, studentId)).toBe(3);
  });

  it('a lone submission at exactly the cap boundary is rejected (attemptsUsed === attemptsAllowed)', async () => {
    const store = new SerializableAttemptStore();
    const quizId = 'quiz-3';
    const studentId = 'student-1';
    const attemptsAllowed = 1;

    store.seed({ quizId, studentId }); // already used the only attempt

    const result = await submitAttempt(store, { quizId, studentId, attemptsAllowed });
    expect(result.limitReached).toBe(true);
    expect(store.count(quizId, studentId)).toBe(1);
  });

  it('different students on the same quiz do not contend for the same limit', async () => {
    const store = new SerializableAttemptStore();
    const quizId = 'quiz-4';
    const attemptsAllowed = 1;

    store.seed({ quizId, studentId: 'student-a' }); // student-a used their attempt

    const result = await submitAttempt(store, { quizId, studentId: 'student-b', attemptsAllowed });
    expect(result.limitReached).toBe(false);
    expect(store.count(quizId, 'student-b')).toBe(1);
  });
});
