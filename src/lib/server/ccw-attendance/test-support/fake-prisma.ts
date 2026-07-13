/**
 * In-memory fake of the Prisma client, scoped to exactly the queries the
 * CCW attendance capture + admin-ops code issues. Wired into tests via
 * `vi.mock('@/lib/prisma', () => import('./test-support/fake-prisma')...)`.
 *
 * It exercises the REAL service logic (write-once day marks, capacity,
 * SERIALIZABLE `$transaction`, direct write-once-respecting corrections, merge
 * backfill) against mutable arrays — no DB, no network. Each test FILE gets its
 * own module instance (vitest isolates module registries per file); call
 * `resetFakeStore()` in `beforeEach`.
 *
 * There is NO append-only check-in ledger anymore: this course grants no CECs,
 * so the regulatory audit ledger is gone and the day columns are the write-once
 * source of truth.
 *
 * NOT a general Prisma emulator — it only understands the specific `where` /
 * `select` shapes used by this unit. Keep it in lock-step with them.
 */
import { randomUUID } from 'node:crypto';

export interface FakeSignIn {
  id: string;
  eventSlug: string;
  registrationId: string | null;
  studentId: string | null;
  enrollmentId: string | null;
  fullName: string;
  businessName: string | null;
  email: string;
  normalizedEmail: string;
  normalizedBusiness: string | null;
  normalizedName: string;
  day1CheckedInAt: Date | null;
  day2CheckedInAt: Date | null;
  isWalkIn: boolean;
  provisionStatus: string;
  signedInByAdmin: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FakeRegistration {
  id: string;
  eventSlug: string;
  contactEmail: string;
  seatCount: number;
  status: string;
}

interface Store {
  signIns: FakeSignIn[];
  registrations: FakeRegistration[];
  /** Monotonic clock so created rows have strictly increasing createdAt. */
  clock: number;
}

export const fakeStore: Store = {
  signIns: [],
  registrations: [],
  clock: 0,
};

export function resetFakeStore(): void {
  fakeStore.signIns = [];
  fakeStore.registrations = [];
  fakeStore.clock = 0;
}

/** Strictly-increasing timestamps so ordering is deterministic. */
function nextNow(): Date {
  fakeStore.clock += 1000;
  return new Date(Date.UTC(2026, 6, 22, 0, 0, fakeStore.clock / 1000));
}

function pick<T extends object>(row: T, select?: Record<string, boolean>): Partial<T> | T {
  if (!select) return row;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(select)) {
    if (select[key]) out[key] = (row as Record<string, unknown>)[key];
  }
  return out as Partial<T>;
}

const ccwRoadshowSignIn = {
  findUnique(args: { where: Record<string, unknown>; select?: Record<string, boolean> }) {
    const w = args.where;
    let row: FakeSignIn | undefined;
    if (typeof w.id === 'string') {
      row = fakeStore.signIns.find((s) => s.id === w.id);
    } else if (w.eventSlug_normalizedEmail) {
      const c = w.eventSlug_normalizedEmail as { eventSlug: string; normalizedEmail: string };
      row = fakeStore.signIns.find(
        (s) => s.eventSlug === c.eventSlug && s.normalizedEmail === c.normalizedEmail,
      );
    } else if (typeof w.enrollmentId === 'string') {
      row = fakeStore.signIns.find((s) => s.enrollmentId === w.enrollmentId);
    }
    if (!row) return Promise.resolve(null);
    return Promise.resolve(pick(row, args.select));
  },

  create(args: { data: Partial<FakeSignIn> }) {
    const now = nextNow();
    const row: FakeSignIn = {
      id: randomUUID(),
      eventSlug: '',
      registrationId: null,
      studentId: null,
      enrollmentId: null,
      fullName: '',
      businessName: null,
      email: '',
      normalizedEmail: '',
      normalizedBusiness: null,
      normalizedName: '',
      day1CheckedInAt: null,
      day2CheckedInAt: null,
      isWalkIn: false,
      provisionStatus: 'pending',
      signedInByAdmin: null,
      createdAt: now,
      updatedAt: now,
      ...args.data,
    };
    fakeStore.signIns.push(row);
    return Promise.resolve(row);
  },

  update(args: { where: { id: string }; data: Record<string, unknown>; select?: Record<string, boolean> }) {
    const row = fakeStore.signIns.find((s) => s.id === args.where.id);
    if (!row) throw new Error('signIn not found');
    Object.assign(row, args.data);
    row.updatedAt = nextNow();
    return Promise.resolve(pick(row, args.select));
  },

  updateMany(args: { where: Record<string, unknown>; data: Record<string, unknown> }) {
    let count = 0;
    for (const row of fakeStore.signIns) {
      if (matchSignInWhere(row, args.where)) {
        Object.assign(row, args.data);
        count += 1;
      }
    }
    return Promise.resolve({ count });
  },

  delete(args: { where: { id: string } }) {
    const idx = fakeStore.signIns.findIndex((s) => s.id === args.where.id);
    if (idx === -1) throw new Error('signIn not found');
    const [removed] = fakeStore.signIns.splice(idx, 1);
    return Promise.resolve(removed);
  },

  count(args: { where: Record<string, unknown> }) {
    return Promise.resolve(fakeStore.signIns.filter((s) => matchSignInWhere(s, args.where)).length);
  },

  findMany(args: { where?: Record<string, unknown>; orderBy?: unknown; select?: Record<string, boolean> }) {
    let rows = fakeStore.signIns.filter((s) => matchSignInWhere(s, args.where ?? {}));
    rows = rows.slice().sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return Promise.resolve(rows.map((row) => pick(row, args.select)));
  },
};

function matchSignInWhere(row: FakeSignIn, where: Record<string, unknown>): boolean {
  for (const [key, cond] of Object.entries(where)) {
    if (key === 'id' && typeof cond === 'object' && cond !== null && 'not' in (cond as object)) {
      if (row.id === (cond as { not: string }).not) return false;
      continue;
    }
    if (key === 'day1CheckedInAt' && typeof cond === 'object' && cond !== null && 'not' in (cond as object)) {
      if (row.day1CheckedInAt == null) return false;
      continue;
    }
    if (key === 'day2CheckedInAt' && typeof cond === 'object' && cond !== null && 'not' in (cond as object)) {
      if (row.day2CheckedInAt == null) return false;
      continue;
    }
    if (key === 'enrollmentId' && typeof cond === 'object' && cond !== null && 'not' in (cond as object)) {
      if (row.enrollmentId == null) return false;
      continue;
    }
    if ((row as unknown as Record<string, unknown>)[key] !== cond) return false;
  }
  return true;
}

const ccwRoadshowRegistration = {
  aggregate(args: { _sum: { seatCount: true }; where: { eventSlug: string; status: string } }) {
    const sum = fakeStore.registrations
      .filter((r) => r.eventSlug === args.where.eventSlug && r.status === args.where.status)
      .reduce((acc, r) => acc + r.seatCount, 0);
    return Promise.resolve({ _sum: { seatCount: sum } });
  },

  findMany(args: { where: { eventSlug: string; status: string }; select?: Record<string, boolean> }) {
    const rows = fakeStore.registrations.filter(
      (r) => r.eventSlug === args.where.eventSlug && r.status === args.where.status,
    );
    return Promise.resolve(rows.map((r) => pick(r, args.select)));
  },
};

async function $transaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
  return fn(fakePrisma);
}

export const fakePrisma = {
  $transaction,
  ccwRoadshowSignIn,
  ccwRoadshowRegistration,
};

// ---- test seed helpers -----------------------------------------------------

export function seedRegistration(reg: Partial<FakeRegistration> & { eventSlug: string; contactEmail: string }): FakeRegistration {
  const row: FakeRegistration = {
    id: randomUUID(),
    seatCount: 1,
    status: 'confirmed',
    ...reg,
  };
  fakeStore.registrations.push(row);
  return row;
}
