import { describe, expect, it } from 'vitest';

import { isProvisionalPasswordHash, verifyPassword } from '@/lib/server/lms-auth';
import { parseAssessmentResponsesJson } from '@/lib/coaching-portal/assessment-schema';
import { parseOnboardingSnapshotJson } from '@/lib/coaching-portal/onboarding-snapshot';
import {
  PARTNER_DEMO_LOCKED_PASSWORD_PREFIX,
  PARTNER_DEMO_SEED_MEMBER_EMAIL,
  PARTNER_DEMO_SEED_USER_ID,
  applyPartnerDemoSeed,
  buildPartnerDemoSeedPlan,
  checkPartnerDemoSeedAllowed,
  isPartnerDemoEmail,
  partnerDemoId,
  type PartnerDemoSeedDb,
} from '@/lib/coaching-portal/partner-demo-seed';

const NOW = new Date('2026-11-04T00:00:00.000Z');
const ENABLED = { CARSI_COACHING_DEMO_ENABLED: 'true' };
const LOCAL_URL = 'postgresql://root:root@127.0.0.1:5432/carsi';

type Row = Record<string, unknown> & { id: string };
type Table = Map<string, Row>;

/**
 * In-memory stand-in for the Prisma delegates the seed touches. It records every write so the
 * tests can prove the seed never writes a row that does not belong to the demo member.
 */
function fakeDb(seed?: { users?: Row[] }) {
  const tables: Record<string, Table> = {
    lmsUser: new Map(),
    carsiCoachingMonthlySubscription: new Map(),
    carsiCoachingBusinessProfile: new Map(),
    carsiCoachingAssessment: new Map(),
    carsiCoachingGrowthPlan: new Map(),
    carsiCoachingAction: new Map(),
    carsiCoachingSession: new Map(),
  };
  for (const u of seed?.users ?? []) tables.lmsUser.set(u.id, { ...u });
  const writes: { table: string; op: string; args: unknown }[] = [];

  const matches = (row: Row, where: Record<string, unknown>) =>
    Object.entries(where).every(([k, v]) => {
      if (v && typeof v === 'object' && 'notIn' in (v as object)) {
        return !(v as { notIn: unknown[] }).notIn.includes(row[k]);
      }
      return row[k] === v;
    });

  const delegate = (name: string, uniqueKey: 'id' | 'userId' | 'email' = 'id') => ({
    findUnique: async ({ where }: { where: Record<string, unknown> }) => {
      for (const row of tables[name].values()) if (matches(row, where)) return { ...row };
      return null;
    },
    findMany: async ({ where }: { where: Record<string, unknown> }) => {
      const idIn = (where.id as { in?: unknown[] } | undefined)?.in;
      const userNot = (where.userId as { not?: unknown } | undefined)?.not;
      return [...tables[name].values()]
        .filter((r) => (idIn ? idIn.includes(r.id) : true))
        .filter((r) => (userNot !== undefined ? r.userId !== userNot : true))
        .map((r) => ({ ...r }));
    },
    upsert: async (args: {
      where: Record<string, unknown>;
      create: Row;
      update: Record<string, unknown>;
    }) => {
      writes.push({ table: name, op: 'upsert', args });
      // Like Prisma/Postgres: the row must match EVERY where field (unique key plus any extra
      // filters); otherwise a create is attempted and a duplicate key raises.
      const existing = [...tables[name].values()].find((r) => matches(r, args.where));
      if (existing) {
        Object.assign(existing, args.update);
        return { ...existing };
      }
      const clash = [...tables[name].values()].find(
        (r) => r.id === args.create.id || (uniqueKey !== 'id' && r[uniqueKey] === args.create[uniqueKey])
      );
      if (clash) throw new Error(`Unique constraint failed on ${name}`);
      tables[name].set(args.create.id, { ...args.create });
      return { ...args.create };
    },
    deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
      writes.push({ table: name, op: 'deleteMany', args: { where } });
      let count = 0;
      for (const [id, row] of tables[name]) {
        if (matches(row, where)) {
          tables[name].delete(id);
          count += 1;
        }
      }
      return { count };
    },
  });

  const delegates = {
    lmsUser: delegate('lmsUser'),
    carsiCoachingMonthlySubscription: delegate('carsiCoachingMonthlySubscription', 'userId'),
    carsiCoachingBusinessProfile: delegate('carsiCoachingBusinessProfile', 'userId'),
    carsiCoachingAssessment: delegate('carsiCoachingAssessment'),
    carsiCoachingGrowthPlan: delegate('carsiCoachingGrowthPlan', 'userId'),
    carsiCoachingAction: delegate('carsiCoachingAction'),
    carsiCoachingSession: delegate('carsiCoachingSession'),
  };
  const db = {
    ...delegates,
    // All-or-nothing like a database transaction: restore every table if the callback throws.
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const saved = Object.fromEntries(
        Object.entries(tables).map(([k, t]) => [k, new Map([...t].map(([id, r]) => [id, { ...r }]))])
      );
      try {
        return await fn(delegates);
      } catch (err) {
        for (const [k, t] of Object.entries(saved)) tables[k] = t;
        throw err;
      }
    },
  } as unknown as PartnerDemoSeedDb;

  const snapshot = () =>
    JSON.stringify(
      Object.fromEntries(
        Object.entries(tables).map(([k, t]) => [
          k,
          [...t.values()].sort((a, b) => a.id.localeCompare(b.id)),
        ])
      )
    );

  return { db, tables, writes, snapshot };
}

describe('partner demo seed guard', () => {
  it('refuses when CARSI_COACHING_DEMO_ENABLED is not exactly "true"', () => {
    for (const env of [{}, { CARSI_COACHING_DEMO_ENABLED: '1' }, { CARSI_COACHING_DEMO_ENABLED: 'TRUE ' }]) {
      const r = checkPartnerDemoSeedAllowed({ env, databaseUrl: LOCAL_URL });
      expect(r.ok).toBe(false);
    }
  });

  it('allows only a local database host by default', () => {
    for (const host of ['127.0.0.1', 'localhost', '[::1]']) {
      const r = checkPartnerDemoSeedAllowed({
        env: ENABLED,
        databaseUrl: `postgresql://u:p@${host}:5432/carsi`,
      });
      expect(r.ok).toBe(true);
    }
  });

  it('refuses a remote host unless that exact host is named', () => {
    const remote = 'postgresql://u:p@db-carsi.example.ondigitalocean.com:25060/carsi?sslmode=require';
    expect(checkPartnerDemoSeedAllowed({ env: ENABLED, databaseUrl: remote }).ok).toBe(false);
    expect(
      checkPartnerDemoSeedAllowed({ env: ENABLED, databaseUrl: remote, allowHost: 'other.example' }).ok
    ).toBe(false);
    expect(
      checkPartnerDemoSeedAllowed({
        env: ENABLED,
        databaseUrl: remote,
        allowHost: 'db-carsi.example.ondigitalocean.com',
      }).ok
    ).toBe(true);
  });

  it('refuses a URL whose query parameters move the connection elsewhere (CodeRabbit PR #1007)', () => {
    // node-postgres reads ?host= over the URL hostname, so the guard must not trust the hostname alone.
    for (const url of [
      'postgresql://u:p@localhost:5432/carsi?host=db.example.com',
      'postgresql://u:p@127.0.0.1:5432/carsi?sslmode=disable&host=db.example.com',
      'postgresql://u:p@localhost:5432/carsi?%68ost=db.example.com',
      'postgresql://u:p@localhost:5432/carsi?HOST=db.example.com',
      'postgresql://u:p@localhost:5432/carsi?hostaddr=203.0.113.9',
    ]) {
      const r = checkPartnerDemoSeedAllowed({ env: ENABLED, databaseUrl: url });
      expect(r.ok, url).toBe(false);
    }
    // Naming the remote host does not unlock a URL that hides it in a parameter either.
    expect(
      checkPartnerDemoSeedAllowed({
        env: ENABLED,
        databaseUrl: 'postgresql://u:p@localhost:5432/carsi?host=db.example.com',
        allowHost: 'localhost',
      }).ok
    ).toBe(false);
    // An ordinary local URL with harmless parameters is still allowed.
    expect(
      checkPartnerDemoSeedAllowed({
        env: ENABLED,
        databaseUrl: 'postgresql://u:p@localhost:5432/carsi?sslmode=disable&schema=public',
      }).ok
    ).toBe(true);
  });

  it('refuses anything that is not a postgres:// or postgresql:// URL', () => {
    for (const url of ['socket://localhost/var/run/postgresql?db=carsi', 'http://localhost:5432/carsi']) {
      expect(checkPartnerDemoSeedAllowed({ env: ENABLED, databaseUrl: url }).ok, url).toBe(false);
    }
    expect(
      checkPartnerDemoSeedAllowed({ env: ENABLED, databaseUrl: 'postgres://u:p@localhost:5432/carsi' }).ok
    ).toBe(true);
  });

  it('refuses a missing or unparseable DATABASE_URL', () => {
    expect(checkPartnerDemoSeedAllowed({ env: ENABLED, databaseUrl: '' }).ok).toBe(false);
    expect(checkPartnerDemoSeedAllowed({ env: ENABLED, databaseUrl: 'not a url' }).ok).toBe(false);
  });
});

describe('partner demo seed plan', () => {
  const plan = buildPartnerDemoSeedPlan(NOW);

  it('is deterministic for the same clock', () => {
    expect(JSON.stringify(buildPartnerDemoSeedPlan(NOW))).toBe(JSON.stringify(plan));
  });

  it('uses stable, valid UUIDs', () => {
    expect(partnerDemoId('member')).toBe(PARTNER_DEMO_SEED_USER_ID);
    expect(partnerDemoId('x')).toBe(partnerDemoId('x'));
    expect(partnerDemoId('x')).not.toBe(partnerDemoId('y'));
    expect(PARTNER_DEMO_SEED_USER_ID).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it('marks the demo member with a non-deliverable demo email', () => {
    expect(plan.user.email).toBe(PARTNER_DEMO_SEED_MEMBER_EMAIL);
    expect(isPartnerDemoEmail(plan.user.email)).toBe(true);
    expect(plan.user.email.endsWith('.invalid')).toBe(true);
    expect(isPartnerDemoEmail('someone@carsi.com.au')).toBe(false);
    expect(isPartnerDemoEmail('x@notdemo.carsi.invalid.com')).toBe(false);
    expect(plan.user.emailOptOut).toBe(true);
  });

  it('every coaching row belongs to the demo member', () => {
    const rows = [
      plan.subscription,
      plan.profile,
      plan.assessment,
      plan.growthPlan,
      ...plan.actions,
      ...plan.sessions,
    ];
    for (const row of rows) expect(row.userId).toBe(PARTNER_DEMO_SEED_USER_ID);
  });

  it('carries the ticket content: 6 actions in mixed states, one past and one upcoming session', () => {
    expect(plan.actions).toHaveLength(6);
    expect(new Set(plan.actions.map((a) => a.status))).toEqual(
      new Set(['todo', 'in_progress', 'done', 'blocked'])
    );
    const past = plan.sessions.filter((s) => s.scheduledAt < NOW);
    const upcoming = plan.sessions.filter((s) => s.scheduledAt > NOW);
    expect(past).toHaveLength(1);
    expect(upcoming).toHaveLength(1);
    expect(past[0].status).toBe('completed');
    expect(JSON.parse(past[0].decisionsJson ?? '[]').length).toBeGreaterThan(0);
    expect(upcoming[0].status).toBe('scheduled');
    expect(Object.keys(JSON.parse(upcoming[0].prepResponsesJson ?? '{}')).length).toBeGreaterThan(0);
    expect(plan.growthPlan.status).toBe('approved');
    expect(plan.growthPlan.approvedAt).toBeInstanceOf(Date);
    expect(plan.assessment.status).toBe('reviewed');
  });

  it('answers every assessment question, so the frozen packet has no blank fields', () => {
    const responses = parseAssessmentResponsesJson(plan.assessment.responsesJson);
    const blank = Object.entries(responses).filter(([, v]) => !v.trim());
    expect(blank).toEqual([]);
    const snapshot = parseOnboardingSnapshotJson(plan.profile.onboardingSnapshotJson);
    expect(snapshot).not.toBeNull();
    expect(snapshot?.member.email).toBe(PARTNER_DEMO_SEED_MEMBER_EMAIL);
    expect(snapshot?.assessmentResponses).toEqual(responses);
  });

  it('marks onboarding emails as already sent so seeding never triggers a send', () => {
    expect(plan.profile.onboardingEmailsSentAt).toBeInstanceOf(Date);
    expect(plan.profile.onboardingSubmittedAt).toBeInstanceOf(Date);
  });

  it('gives the portal an active, Stripe-free subscription that lasts beyond the demo', () => {
    expect(plan.subscription.status).toBe('active');
    expect(plan.subscription.stripeCustomerId).toBeNull();
    expect(plan.subscription.stripeSubscriptionId).toBeNull();
    expect(plan.subscription.currentPeriodEnd.getTime()).toBeGreaterThan(NOW.getTime());
  });
});

describe('demo password lock', () => {
  it('a locked demo login can never sign in and is not claimable by guest checkout', async () => {
    const hash = `${PARTNER_DEMO_LOCKED_PASSWORD_PREFIX}abc`;
    expect(await verifyPassword('', hash)).toBe(false);
    expect(await verifyPassword(hash, hash)).toBe(false);
    expect(isProvisionalPasswordHash(hash)).toBe(false);
  });
});

describe('applyPartnerDemoSeed', () => {
  it('dry run reports the writes and changes nothing', async () => {
    const { db, writes, snapshot } = fakeDb();
    const before = snapshot();
    const report = await applyPartnerDemoSeed(db, buildPartnerDemoSeedPlan(NOW), { dryRun: true });
    expect(report.dryRun).toBe(true);
    expect(report.operations.length).toBeGreaterThan(0);
    expect(writes).toEqual([]);
    expect(snapshot()).toBe(before);
  });

  it('is idempotent: a second run leaves the same rows', async () => {
    const { db, snapshot } = fakeDb();
    const plan = buildPartnerDemoSeedPlan(NOW);
    await applyPartnerDemoSeed(db, plan, { dryRun: false });
    const first = snapshot();
    await applyPartnerDemoSeed(db, plan, { dryRun: false });
    expect(snapshot()).toBe(first);
  });

  it('writes only demo rows and leaves a real member untouched', async () => {
    const real: Row = {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'real.member@carsi.com.au',
      hashedPassword: '$2a$12$realrealrealrealrealrealrealrealrealrealrealrealrealre',
    };
    const { db, tables, writes } = fakeDb({ users: [real] });
    tables.carsiCoachingAction.set('real-action', { id: 'real-action', userId: real.id, title: 'Mine' });
    const plan = buildPartnerDemoSeedPlan(NOW);
    const planIds = new Set([
      plan.assessment.id,
      ...plan.actions.map((a) => a.id),
      ...plan.sessions.map((s) => s.id),
    ]);
    const PER_USER_TABLES = new Set([
      'carsiCoachingMonthlySubscription',
      'carsiCoachingBusinessProfile',
      'carsiCoachingGrowthPlan',
    ]);
    await applyPartnerDemoSeed(db, plan, { dryRun: false });
    expect(writes.length).toBeGreaterThan(0);

    expect(tables.lmsUser.get(real.id)).toEqual(real);
    expect(tables.carsiCoachingAction.get('real-action')).toBeDefined();
    for (const w of writes) {
      const args = w.args as { where: Record<string, unknown>; create?: Row };
      if (w.table === 'lmsUser') {
        // Pinned to the demo id AND the demo email, so another login can never match (review r5 P1).
        expect(args.where).toEqual({ id: PARTNER_DEMO_SEED_USER_ID, email: PARTNER_DEMO_SEED_MEMBER_EMAIL });
        continue;
      }
      if (w.op === 'deleteMany') {
        // A delete must be pinned to the demo member, never just "ids not in the plan".
        expect(args.where.userId).toBe(PARTNER_DEMO_SEED_USER_ID);
        continue;
      }
      expect(args.create?.userId).toBe(PARTNER_DEMO_SEED_USER_ID);
      if (PER_USER_TABLES.has(w.table)) {
        // One row per member: the lookup key itself must be the demo member.
        expect(args.where).toEqual({ userId: PARTNER_DEMO_SEED_USER_ID });
      } else {
        // Many rows per member: matched on the planned demo id AND the demo member, so the
        // write can never update a row someone else owns.
        expect(args.where).toEqual({ id: args.where.id, userId: PARTNER_DEMO_SEED_USER_ID });
        expect(planIds.has(String(args.where.id))).toBe(true);
      }
    }
  });

  it('resets demo rows a prospect added during a call', async () => {
    const { db, tables } = fakeDb();
    const plan = buildPartnerDemoSeedPlan(NOW);
    await applyPartnerDemoSeed(db, plan, { dryRun: false });
    tables.carsiCoachingAction.set('extra', {
      id: 'extra',
      userId: PARTNER_DEMO_SEED_USER_ID,
      title: 'Added live',
    });
    await applyPartnerDemoSeed(db, plan, { dryRun: false });
    expect(tables.carsiCoachingAction.has('extra')).toBe(false);
    expect(tables.carsiCoachingAction.size).toBe(6);
  });

  it('new demo login is locked; a password an admin set later survives a re-run', async () => {
    const { db, tables } = fakeDb();
    const plan = buildPartnerDemoSeedPlan(NOW);
    await applyPartnerDemoSeed(db, plan, { dryRun: false });
    const created = tables.lmsUser.get(PARTNER_DEMO_SEED_USER_ID);
    expect(String(created?.hashedPassword)).toMatch(/^demo-locked:/);

    const adminSet = '$2a$12$adminsetadminsetadminsetadminsetadminsetadminsetadmins';
    created!.hashedPassword = adminSet;
    await applyPartnerDemoSeed(db, plan, { dryRun: false });
    expect(tables.lmsUser.get(PARTNER_DEMO_SEED_USER_ID)?.hashedPassword).toBe(adminSet);
  });

  it('refuses when the demo email already belongs to a different account', async () => {
    const squatter: Row = {
      id: '22222222-2222-4222-8222-222222222222',
      email: PARTNER_DEMO_SEED_MEMBER_EMAIL,
      hashedPassword: 'provisional:x',
    };
    const { db, writes } = fakeDb({ users: [squatter] });
    await expect(
      applyPartnerDemoSeed(db, buildPartnerDemoSeedPlan(NOW), { dryRun: false })
    ).rejects.toThrow(/belongs to a different account/);
    expect(writes).toEqual([]);
  });
  it('refuses, writing nothing, when a planned row id is owned by another member', async () => {
    const plan = buildPartnerDemoSeedPlan(NOW);
    for (const [table, id] of [
      ['carsiCoachingAction', plan.actions[0].id],
      ['carsiCoachingSession', plan.sessions[1].id],
      ['carsiCoachingAssessment', plan.assessment.id],
    ] as const) {
      const realId = '33333333-3333-4333-8333-333333333333';
      const { db, tables, writes, snapshot } = fakeDb({
        users: [{ id: realId, email: 'real@carsi.com.au', hashedPassword: '$2a$12$x' }],
      });
      tables[table].set(id, { id, userId: realId, title: 'Real member row' });
      const before = snapshot();
      for (const dryRun of [true, false]) {
        await expect(applyPartnerDemoSeed(db, plan, { dryRun }), table).rejects.toThrow(
          /owned by another member/
        );
      }
      expect(writes, table).toEqual([]);
      expect(snapshot(), table).toBe(before);
    }
  });

  it('a collision appearing after the check still cannot update the other member, and nothing is half-written', async () => {
    const plan = buildPartnerDemoSeedPlan(NOW);
    const realId = '44444444-4444-4444-8444-444444444444';
    const { db, tables } = fakeDb({
      users: [{ id: realId, email: 'late@carsi.com.au', hashedPassword: '$2a$12$x' }],
    });
    // Simulate another member's row appearing between the ownership check and the writes.
    const raw = db as unknown as { carsiCoachingSession: { findMany: (a: unknown) => Promise<unknown[]> } };
    const realFindMany = raw.carsiCoachingSession.findMany;
    // Keep a handle on the other member's row object: any update the seed applied to it would
    // show on this object even after the fake's rollback swaps the table maps back.
    const lateRow: Row = { id: plan.actions[2].id, userId: realId, title: 'Arrived late' };
    raw.carsiCoachingSession.findMany = async (a: unknown) => {
      const r = await realFindMany(a);
      tables.carsiCoachingAction.set(lateRow.id, lateRow);
      return r;
    };
    await expect(applyPartnerDemoSeed(db, plan, { dryRun: false })).rejects.toThrow(
      /Unique constraint/
    );
    expect(lateRow).toEqual({ id: plan.actions[2].id, userId: realId, title: 'Arrived late' });
    // Rolled back: no demo user or demo coaching rows were left behind.
    expect(tables.lmsUser.has(PARTNER_DEMO_SEED_USER_ID)).toBe(false);
    expect(tables.carsiCoachingMonthlySubscription.size).toBe(0);
  });

  it('a login that takes the demo id after the check is not overwritten, and nothing is half-written (review r5 P1)', async () => {
    const plan = buildPartnerDemoSeedPlan(NOW);
    const { db, tables } = fakeDb();
    const raw = db as unknown as { carsiCoachingSession: { findMany: (a: unknown) => Promise<unknown[]> } };
    const realFindMany = raw.carsiCoachingSession.findMany;
    // Held by reference: an update the seed applied would show here even after rollback.
    const claimant: Row = {
      id: PARTNER_DEMO_SEED_USER_ID,
      email: 'real.person@carsi.com.au',
      hashedPassword: '$2a$12$realmemberhash',
      fullName: 'Real Account',
    };
    raw.carsiCoachingSession.findMany = async (a: unknown) => {
      const r = await realFindMany(a);
      tables.lmsUser.set(claimant.id, claimant);
      return r;
    };
    await expect(applyPartnerDemoSeed(db, plan, { dryRun: false })).rejects.toThrow(/Unique constraint/);
    expect(claimant).toEqual({
      id: PARTNER_DEMO_SEED_USER_ID,
      email: 'real.person@carsi.com.au',
      hashedPassword: '$2a$12$realmemberhash',
      fullName: 'Real Account',
    });
    expect(tables.carsiCoachingMonthlySubscription.size).toBe(0);
    expect(tables.carsiCoachingAction.size).toBe(0);
  });
});
