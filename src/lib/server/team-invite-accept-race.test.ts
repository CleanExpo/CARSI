import { describe, expect, it, vi } from 'vitest';

/**
 * FINDING 1 (PR #381 review, GP-442): seat allocation on invite acceptance must
 * be ATOMIC. The old route did `count()` then a guard then a SEPARATE
 * `$transaction([...])` that did not re-read the count — a TOCTOU race where two
 * concurrent acceptances on the last free seat both pass the guard and both
 * insert, pushing member rows past the paid seat limit.
 *
 * The fix runs the seat re-check + member insert inside a single SERIALIZABLE
 * `runSerializable(...)` transaction (see app/api/lms/teams/invite/accept/route.ts).
 * This test reproduces the concurrency at the transaction layer WITHOUT a real
 * database by:
 *   - mocking `@/lib/prisma` so `$transaction(fn, { isolationLevel })` invokes
 *     the callback (exercising the REAL runSerializable / withSerializationRetry
 *     retry logic — the production seam), and
 *   - modelling Postgres SERIALIZABLE semantics in an in-memory store: a
 *     transaction that read the seat count and then writes conflicts with any
 *     OTHER transaction that committed a write to the same team since our read;
 *     the loser is aborted with a serialization failure (P2034), which
 *     runSerializable retries → on retry it re-reads the (now-full) count and is
 *     rejected as seat_full.
 *
 * It asserts the property the fix guarantees: at the last free seat, exactly one
 * concurrent acceptance succeeds, the other gets seat_full (→ 409), and the
 * member count NEVER exceeds seatLimit.
 */

interface MemberRow {
  teamId: string;
  userId: string;
}

/**
 * In-memory model of the two Prisma operations the atomic guard makes inside the
 * transaction — count and upsert (insert-if-absent) — with SERIALIZABLE conflict
 * detection keyed on a per-team monotonic version. A transaction that read the
 * count at version V and then writes conflicts (P2034) if the team's version has
 * advanced since — exactly what Postgres does aborting the second writer (40001).
 */
class SerializableSeatStore {
  private members: MemberRow[] = [];
  private versionByTeam = new Map<string, number>();

  seatCount(teamId: string): number {
    return this.members.filter((m) => m.teamId === teamId).length;
  }

  version(teamId: string): number {
    return this.versionByTeam.get(teamId) ?? 0;
  }

  hasMember(teamId: string, userId: string): boolean {
    return this.members.some((m) => m.teamId === teamId && m.userId === userId);
  }

  /** Seed a committed member without race semantics (test setup). */
  seed(row: MemberRow): void {
    if (!this.hasMember(row.teamId, row.userId)) this.members.push(row);
    this.versionByTeam.set(row.teamId, this.version(row.teamId) + 1);
  }

  /**
   * Commit an insert observed at `readVersion`. If the team version advanced
   * since (another writer committed first), throw P2034 — the serialization
   * conflict runSerializable retries on.
   */
  commitInsert(row: MemberRow, readVersion: number): void {
    if (this.version(row.teamId) !== readVersion) {
      throw { code: 'P2034', message: 'could not serialize access due to read/write dependencies' };
    }
    if (!this.hasMember(row.teamId, row.userId)) this.members.push(row);
    this.versionByTeam.set(row.teamId, readVersion + 1);
  }
}

const store = new SerializableSeatStore();

/**
 * A barrier that forces true read/write interleaving between the two racers: the
 * first N transactions to reach it all wait until N have arrived, so both read
 * the seat count at the SAME version before either commits. Without this, the
 * synchronous callbacks would run to completion one after another and never race.
 */
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

// Mock prisma so $transaction(fn, opts) just runs the callback. The callback in
// this test uses the closure `store` rather than a tx client, so we pass a stub.
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
  },
}));

// Import AFTER the mock is registered so db-tx binds to the mocked prisma.
const { runSerializable } = await import('./db-tx');

/**
 * The atomic seat-allocation guard as the route runs it: re-read the count inside
 * the transaction, reject when full, else insert. Modelled on
 * app/api/lms/teams/invite/accept/route.ts. `barrier` (optional) forces the two
 * racers to interleave their reads before any write.
 */
async function acceptSeat(
  params: { teamId: string; userId: string; seatLimit: number },
  barrier?: () => Promise<void>,
): Promise<{ seatFull: boolean }> {
  return runSerializable(async () => {
    const { teamId, userId, seatLimit } = params;
    const readVersion = store.version(teamId);

    let full = false;
    if (!store.hasMember(teamId, userId)) {
      if (store.seatCount(teamId) >= seatLimit) full = true;
    }

    // Interleave: both racers read above, then both proceed to commit below.
    if (barrier) await barrier();

    if (full) return { seatFull: true };
    store.commitInsert({ teamId, userId }, readVersion);
    return { seatFull: false };
  });
}

describe('invite/accept atomic seat allocation (Finding 1, GP-442)', () => {
  it('rejects the (seatLimit+1)th concurrent acceptance and never exceeds seatLimit', async () => {
    const teamId = 'team-1';
    const seatLimit = 5;

    // Owner holds seat 0; seats 1..3 filled → 4 used, ONE free seat left.
    for (const userId of ['owner', 'u1', 'u2', 'u3']) store.seed({ teamId, userId });
    expect(store.seatCount(teamId)).toBe(4);

    // Two DIFFERENT users race for the single remaining seat, reads interleaved.
    const barrier = makeBarrier(2);
    const results = await Promise.all([
      acceptSeat({ teamId, userId: 'race-a', seatLimit }, barrier),
      acceptSeat({ teamId, userId: 'race-b', seatLimit }, barrier),
    ]);

    const succeeded = results.filter((r) => !r.seatFull).length;
    const rejected = results.filter((r) => r.seatFull).length;

    // Exactly one wins the last seat; the other is rejected as seat_full (→ 409).
    expect(succeeded).toBe(1);
    expect(rejected).toBe(1);

    // The invariant the whole fix exists to protect.
    expect(store.seatCount(teamId)).toBe(seatLimit);
    expect(store.seatCount(teamId)).toBeLessThanOrEqual(seatLimit);
  });

  it('lets both concurrent acceptances through when two seats are free', async () => {
    const teamId = 'team-2';
    const seatLimit = 5;

    for (const userId of ['owner', 'u1', 'u2']) store.seed({ teamId, userId }); // 3 used → 2 free

    const barrier = makeBarrier(2);
    const results = await Promise.all([
      acceptSeat({ teamId, userId: 'race-a', seatLimit }, barrier),
      acceptSeat({ teamId, userId: 'race-b', seatLimit }, barrier),
    ]);

    expect(results.every((r) => !r.seatFull)).toBe(true);
    expect(store.seatCount(teamId)).toBe(5);
  });

  it('is idempotent: an already-seated member re-accepting does not consume a seat or 409 when full', async () => {
    const teamId = 'team-3';
    const seatLimit = 3;

    for (const userId of ['owner', 'u1', 'u2']) store.seed({ teamId, userId }); // exactly full
    expect(store.seatCount(teamId)).toBe(3);

    // 'u1' re-accepts on a FULL team — must succeed (no new seat), not 409.
    const res = await acceptSeat({ teamId, userId: 'u1', seatLimit });
    expect(res.seatFull).toBe(false);
    expect(store.seatCount(teamId)).toBe(3);

    // A NEW user on the full team is still rejected.
    const res2 = await acceptSeat({ teamId, userId: 'newcomer', seatLimit });
    expect(res2.seatFull).toBe(true);
    expect(store.seatCount(teamId)).toBe(3);
  });
});
