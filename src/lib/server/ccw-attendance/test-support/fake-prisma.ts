/**
 * In-memory fake of the Prisma client, scoped to exactly the queries the
 * CCW attendance capture + admin-ops code issues. Wired into tests via
 * `vi.mock('@/lib/prisma', () => import('./test-support/fake-prisma')...)`.
 *
 * It exercises the REAL service logic (write-once, ledger append, capacity,
 * SERIALIZABLE `$transaction`, merge re-parenting, ledger-derived recompute)
 * against mutable arrays — no DB, no network. Each test FILE gets its own module
 * instance (vitest isolates module registries per file); call `resetFakeStore()`
 * in `beforeEach`.
 *
 * NOT a general Prisma emulator — it only understands the specific `where` /
 * `select` / `include` shapes used by this unit. Keep it in lock-step with them.
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
  iicrcRegNumber: string | null;
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

export interface FakeCheckInEvent {
  id: string;
  signInId: string;
  dayIndex: number;
  action: string;
  actorAdminId: string | null;
  source: string;
  reason: string | null;
  createdAt: Date;
}

export interface FakeRegistration {
  id: string;
  eventSlug: string;
  contactEmail: string;
  seatCount: number;
  status: string;
}

export interface FakeCourse {
  slug: string;
  cecHours: number | null;
}

interface Store {
  signIns: FakeSignIn[];
  events: FakeCheckInEvent[];
  registrations: FakeRegistration[];
  courses: FakeCourse[];
  /** Monotonic clock so ledger rows have strictly increasing createdAt. */
  clock: number;
}

export const fakeStore: Store = {
  signIns: [],
  events: [],
  registrations: [],
  courses: [],
  clock: 0,
};

export function resetFakeStore(): void {
  fakeStore.signIns = [];
  fakeStore.events = [];
  fakeStore.registrations = [];
  fakeStore.courses = [];
  fakeStore.clock = 0;
}

/** Strictly-increasing timestamps so ledger ordering is deterministic. */
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
  findUnique(args: { where: Record<string, unknown>; select?: Record<string, boolean>; include?: Record<string, unknown> }) {
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
    if (args.include?.checkInEvents) {
      return Promise.resolve({ ...row, checkInEvents: eventsFor(row.id, args.include.checkInEvents) });
    }
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
      iicrcRegNumber: null,
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

  update(args: { where: { id: string }; data: Record<string, unknown> }) {
    const row = fakeStore.signIns.find((s) => s.id === args.where.id);
    if (!row) throw new Error('signIn not found');
    Object.assign(row, args.data);
    row.updatedAt = nextNow();
    return Promise.resolve(row);
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
    // Cascade: any ledger rows still pointing at it are removed.
    fakeStore.events = fakeStore.events.filter((e) => e.signInId !== removed.id);
    return Promise.resolve(removed);
  },

  count(args: { where: Record<string, unknown> }) {
    return Promise.resolve(fakeStore.signIns.filter((s) => matchSignInWhere(s, args.where)).length);
  },

  findMany(args: {
    where?: Record<string, unknown>;
    orderBy?: unknown;
    select?: Record<string, boolean>;
    include?: Record<string, unknown>;
  }) {
    let rows = fakeStore.signIns.filter((s) => matchSignInWhere(s, args.where ?? {}));
    rows = rows.slice().sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const out = rows.map((row) => {
      if (args.include?.checkInEvents) {
        return { ...row, checkInEvents: eventsFor(row.id, args.include.checkInEvents) };
      }
      return pick(row, args.select);
    });
    return Promise.resolve(out);
  },
};

function eventsFor(signInId: string, spec: unknown): unknown[] {
  const s = spec as { select?: Record<string, boolean> };
  const rows = fakeStore.events
    .filter((e) => e.signInId === signInId)
    .slice()
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return rows.map((e) => pick(e, s?.select));
}

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

const ccwRoadshowCheckInEvent = {
  create(args: { data: Partial<FakeCheckInEvent> }) {
    const row: FakeCheckInEvent = {
      id: randomUUID(),
      signInId: '',
      dayIndex: 1,
      action: 'checkin',
      actorAdminId: null,
      source: 'self',
      reason: null,
      createdAt: nextNow(),
      ...args.data,
    };
    fakeStore.events.push(row);
    return Promise.resolve(row);
  },

  findMany(args: { where: { signInId?: string }; select?: Record<string, boolean>; orderBy?: unknown }) {
    let rows = fakeStore.events.filter((e) => !args.where.signInId || e.signInId === args.where.signInId);
    rows = rows.slice().sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return Promise.resolve(rows.map((e) => pick(e, args.select)));
  },

  updateMany(args: { where: { signInId?: string }; data: { signInId?: string } }) {
    let count = 0;
    for (const e of fakeStore.events) {
      if (!args.where.signInId || e.signInId === args.where.signInId) {
        if (args.data.signInId) e.signInId = args.data.signInId;
        count += 1;
      }
    }
    return Promise.resolve({ count });
  },

  count(args: { where: { signInId?: string } }) {
    return Promise.resolve(
      fakeStore.events.filter((e) => !args.where.signInId || e.signInId === args.where.signInId).length,
    );
  },
};

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

const lmsCourse = {
  findUnique(args: { where: { slug: string }; select?: Record<string, boolean> }) {
    const row = fakeStore.courses.find((c) => c.slug === args.where.slug);
    return Promise.resolve(row ? pick(row, args.select) : null);
  },
};

async function $transaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
  return fn(fakePrisma);
}

export const fakePrisma = {
  $transaction,
  ccwRoadshowSignIn,
  ccwRoadshowCheckInEvent,
  ccwRoadshowRegistration,
  lmsCourse,
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

export function seedCourse(slug: string, cecHours: number | null): FakeCourse {
  const row: FakeCourse = { slug, cecHours };
  fakeStore.courses.push(row);
  return row;
}
