/**
 * GP-635 — drives the real accountability route handlers with auth, subscription, storage
 * and email mocked. Proves:
 * - 401 when logged out (checked before the flag), 404 while the flag is off;
 * - a member reads and writes only their own KPIs, whatever the request says;
 * - a coach sees only members assigned to them;
 * - the scheduled run sends nothing while either flag is off, and still reports the
 *   day-14 nudge and day-21 coach alert for a time-shifted demo member as a dry run.
 */
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applyKpiDefinitions,
  normaliseKpiDefinitions,
  type AccountabilityAction,
  type PlanAccountability,
} from '@/lib/coaching-portal/accountability';
import type {
  AccountabilityMemberRecord,
  AccountabilityPlanRecord,
  AccountabilityStore,
} from '@/lib/server/carsi-coaching-accountability';

const MEMBER_A = '11111111-1111-4111-8111-111111111111';
const MEMBER_B = '22222222-2222-4222-8222-222222222222';
const MEMBER_C = '33333333-3333-4333-8333-333333333333';
const OWN_COACH = 'coach-phill-mcgurk';
const DAY = 86_400_000;
const T0 = new Date('2026-11-01T23:00:00.000Z');

const state = vi.hoisted(() => ({
  claims: null as { sub: string; email: string; full_name: string; role: string } | null,
  entitled: true,
  admin: false,
  plans: new Map<string, { goals: unknown[]; accountability: unknown; version: number }>(),
  actions: new Map<string, unknown[]>(),
  coachOf: new Map<string, string>(),
  sent: [] as unknown[],
}));

vi.mock('@/lib/server/auth-from-request', () => ({
  getSessionClaimsFromRequest: async () => state.claims,
}));

vi.mock('@/lib/server/carsi-coaching-subscription-store', () => ({
  getCoachingPortalRowForUser: async () =>
    state.entitled
      ? { status: 'active', currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000) }
      : null,
}));

vi.mock('@/lib/admin/admin-session', () => ({
  getAdminSessionOrNull: async () => (state.admin ? { sub: 'admin' } : null),
}));

vi.mock('@/lib/server/email', () => ({
  sendEmail: async (params: unknown) => {
    state.sent.push(params);
    return { sent: true };
  },
  isEmailConfigured: () => true,
}));

vi.mock('@/lib/server/carsi-coaching-accountability-store', () => {
  const store: AccountabilityStore = {
    async readPlan(userId) {
      const p = state.plans.get(userId);
      if (!p) return null;
      return {
        userId,
        goals: p.goals,
        accountability: p.accountability as PlanAccountability | null,
        version: String(p.version),
      } satisfies AccountabilityPlanRecord;
    },
    async writeAccountability(userId, accountability, goals, expectedVersion) {
      const p = state.plans.get(userId);
      if ((p ? String(p.version) : null) !== expectedVersion) return false;
      state.plans.set(userId, { goals, accountability, version: (p?.version ?? 0) + 1 });
      return true;
    },
    async listActions(userId) {
      return (state.actions.get(userId) ?? []) as AccountabilityAction[];
    },
    async listMembers({ coachId }) {
      const out: AccountabilityMemberRecord[] = [];
      for (const [userId, p] of state.plans) {
        const acc = p.accountability as PlanAccountability | null;
        if (!acc) continue;
        // A deliberately leaky fake: it ignores coachId, so the route's own filter is tested.
        void coachId;
        out.push({
          userId,
          label: `Member ${userId.slice(0, 4)}`,
          email: `${userId.slice(0, 4)}@example.test`,
          emailOptOut: false,
          entitled: true,
          accountability: { ...acc, coachId: state.coachOf.get(userId) ?? acc.coachId },
          actions: (state.actions.get(userId) ?? []) as AccountabilityAction[],
        });
      }
      return out;
    },
  };
  return { getAccountabilityStore: () => store };
});

import { GET as coachGET } from '../../../app/api/admin/coaching/accountability/route';
import {
  GET as memberGET,
  POST as memberPOST,
} from '../../../app/api/coaching/portal/accountability/route';
import { GET as cronGET } from '../../../app/api/cron/coaching-accountability/route';

function member(sub: string, role = 'student') {
  return { sub, email: `${sub}@example.test`, full_name: 'Member', role };
}

function req(url: string, body?: unknown, headers?: Record<string, string>) {
  return new NextRequest(url, {
    method: body === undefined ? 'GET' : 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
    headers,
  });
}

const MEMBER_URL = 'http://localhost/api/coaching/portal/accountability';
const COACH_URL = 'http://localhost/api/admin/coaching/accountability';
const CRON_URL = 'http://localhost/api/cron/coaching-accountability';
const CRON_AUTH = { authorization: 'Bearer test-cron-secret' };

function seedDemoMember(userId: string, coachId = OWN_COACH): PlanAccountability {
  const defs = normaliseKpiDefinitions([
    { label: 'Quotes sent' },
    { label: 'Jobs won' },
    { label: 'Google reviews' },
  ]);
  if (!defs.ok) throw new Error('fixture');
  const acc = applyKpiDefinitions(null, defs.kpis, coachId, T0);
  state.plans.set(userId, {
    goals: [{ id: 'g1', title: 'Goal' }],
    accountability: acc,
    version: 1,
  });
  return acc;
}

beforeEach(() => {
  state.claims = null;
  state.entitled = true;
  state.admin = false;
  state.plans = new Map();
  state.actions = new Map();
  state.coachOf = new Map();
  state.sent = [];
  vi.stubEnv('CARSI_COACHING_ACCOUNTABILITY_ENABLED', 'true');
  vi.stubEnv('CARSI_COACHING_ACCOUNTABILITY_EMAILS_ENABLED', '');
  vi.stubEnv('CRON_SECRET', 'test-cron-secret');
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('member route /api/coaching/portal/accountability', () => {
  it('returns 401 when logged out, even with the flag off', async () => {
    vi.stubEnv('CARSI_COACHING_ACCOUNTABILITY_ENABLED', '');
    expect((await memberGET(req(MEMBER_URL))).status).toBe(401);
    expect((await memberPOST(req(MEMBER_URL, { kpis: [] }))).status).toBe(401);
  });

  it('(e) returns 404 for a signed-in member while the flag is off, and writes nothing', async () => {
    state.claims = member(MEMBER_A);
    for (const value of ['', 'false', '1', 'TRUE', ' true']) {
      vi.stubEnv('CARSI_COACHING_ACCOUNTABILITY_ENABLED', value);
      expect((await memberGET(req(MEMBER_URL))).status, JSON.stringify(value)).toBe(404);
      expect(
        (
          await memberPOST(
            req(MEMBER_URL, { kpis: [{ label: 'a1' }, { label: 'b2' }, { label: 'c3' }] })
          )
        ).status
      ).toBe(404);
    }
    expect(state.plans.size).toBe(0);
  });

  it('returns 403 without an active coaching subscription (no admin preview)', async () => {
    state.entitled = false;
    state.claims = member(MEMBER_A, 'admin');
    expect((await memberGET(req(MEMBER_URL))).status).toBe(403);
  });

  it('(a) saves KPIs, then a check-in, and reports the streak', async () => {
    state.claims = member(MEMBER_A);
    const set = await memberPOST(
      req(MEMBER_URL, {
        kpis: [{ label: 'Quotes sent' }, { label: 'Jobs won' }, { label: 'Google reviews' }],
      })
    );
    expect(set.status).toBe(200);
    const view = (await set.json()).accountability;
    expect(view.kpis).toHaveLength(3);
    expect(view.checkInDue).toBe(true);

    const values = Object.fromEntries(
      view.kpis.map((k: { id: string }, i: number) => [k.id, i + 1])
    );
    const res = await memberPOST(req(MEMBER_URL, { checkIn: { values } }));
    expect(res.status).toBe(200);
    const after = (await res.json()).accountability;
    expect(after.streak).toBe(1);
    expect(after.checkInDue).toBe(false);
    expect(after.trend).toHaveLength(1);
    const stored = state.plans.get(MEMBER_A)!.accountability as PlanAccountability;
    expect(stored.checkIns[0]!.values).toEqual(values);
    // Existing goals on the plan survive the write.
    expect(state.plans.get(MEMBER_A)!.goals).toEqual([]);
  });

  it('keeps the plan’s existing goals when KPIs are added', async () => {
    state.plans.set(MEMBER_A, {
      goals: [{ id: 'g1', title: 'Goal' }],
      accountability: null,
      version: 1,
    });
    state.claims = member(MEMBER_A);
    await memberPOST(
      req(MEMBER_URL, {
        kpis: [{ label: 'Quotes sent' }, { label: 'Jobs won' }, { label: 'Reviews' }],
      })
    );
    expect(state.plans.get(MEMBER_A)!.goals).toEqual([{ id: 'g1', title: 'Goal' }]);
  });

  it('rejects invalid KPIs and check-ins with 400', async () => {
    state.claims = member(MEMBER_A);
    expect((await memberPOST(req(MEMBER_URL, { kpis: [{ label: 'Only one' }] }))).status).toBe(400);
    expect((await memberPOST(req(MEMBER_URL, { checkIn: { values: {} } }))).status).toBe(400);
    expect((await memberPOST(req(MEMBER_URL, { nothing: true }))).status).toBe(400);
  });

  it('(d) a member cannot read or write another member’s KPIs', async () => {
    seedDemoMember(MEMBER_B);
    const before = JSON.stringify(state.plans.get(MEMBER_B));
    state.claims = member(MEMBER_A);

    const read = await (await memberGET(req(`${MEMBER_URL}?userId=${MEMBER_B}`))).json();
    expect(read.accountability.kpis).toEqual([]);

    await memberPOST(
      req(MEMBER_URL, {
        userId: MEMBER_B,
        kpis: [{ label: 'Hijack one' }, { label: 'Hijack two' }, { label: 'Hijack three' }],
      })
    );
    expect(JSON.stringify(state.plans.get(MEMBER_B))).toBe(before);
    expect(
      (state.plans.get(MEMBER_A)!.accountability as PlanAccountability).kpis.map((k) => k.label)
    ).toEqual(['Hijack one', 'Hijack two', 'Hijack three']);
  });

  it('records a portal visit, which resets the quiet clock', async () => {
    seedDemoMember(MEMBER_A);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(T0.getTime() + 15 * DAY));
    state.claims = member(MEMBER_A);
    const first = (await (await memberGET(req(MEMBER_URL))).json()).accountability;
    // Shown the "welcome back" message once, computed before this visit is recorded.
    expect(first.quiet).toEqual({ daysSilent: 15 });
    const second = (await (await memberGET(req(MEMBER_URL))).json()).accountability;
    expect(second.quiet).toBeNull();
  });
});

describe('coach route /api/admin/coaching/accountability', () => {
  it('returns 401 for a non-admin and 404 while the flag is off', async () => {
    expect((await coachGET(req(COACH_URL))).status).toBe(401);
    state.admin = true;
    vi.stubEnv('CARSI_COACHING_ACCOUNTABILITY_ENABLED', '');
    expect((await coachGET(req(COACH_URL))).status).toBe(404);
  });

  it('(d) a coach sees only their own members, even if storage returns others', async () => {
    seedDemoMember(MEMBER_A);
    seedDemoMember(MEMBER_B);
    state.coachOf.set(MEMBER_B, 'coach-someone-else');
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(T0.getTime() + 21 * DAY));
    state.admin = true;
    const json = await (await coachGET(req(`${COACH_URL}?coachId=coach-someone-else`))).json();
    expect(json.members.map((m: { userId: string }) => m.userId)).toEqual([MEMBER_A]);
    expect(json.alerts.map((a: { userId: string }) => a.userId)).toEqual([MEMBER_A]);
  });

  it('(c) lists a blocked-goal alert', async () => {
    seedDemoMember(MEMBER_A);
    state.actions.set(MEMBER_A, [
      {
        id: '1',
        title: 'A',
        status: 'blocked',
        dueDate: null,
        goalId: 'g1',
        assignedTo: 'customer',
        completedAt: null,
      },
      {
        id: '2',
        title: 'B',
        status: 'blocked',
        dueDate: null,
        goalId: 'g1',
        assignedTo: 'customer',
        completedAt: null,
      },
    ]);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(T0.getTime() + 2 * DAY));
    state.admin = true;
    const json = await (await coachGET(req(COACH_URL))).json();
    expect(json.alerts).toEqual([
      expect.objectContaining({
        userId: MEMBER_A,
        kind: 'blocked_goal',
        goalId: 'g1',
        blockedCount: 2,
      }),
    ]);
  });
});

describe('scheduled run /api/cron/coaching-accountability', () => {
  it('needs the cron secret', async () => {
    expect((await cronGET(req(CRON_URL))).status).toBe(401);
  });

  it('(e) flag off: does nothing and sends nothing', async () => {
    seedDemoMember(MEMBER_A);
    vi.stubEnv('CARSI_COACHING_ACCOUNTABILITY_ENABLED', '');
    vi.stubEnv('CARSI_COACHING_ACCOUNTABILITY_EMAILS_ENABLED', 'true');
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(T0.getTime() + 30 * DAY));
    const json = await (await cronGET(req(CRON_URL, undefined, CRON_AUTH))).json();
    expect(json).toMatchObject({ ok: true, enabled: false, planned: 0, sent: 0 });
    expect(state.sent).toEqual([]);
  });

  it('(b) time-shifted dry run: day-14 member nudge, day-21 coach alert, nothing sent', async () => {
    seedDemoMember(MEMBER_A);
    vi.useFakeTimers({ toFake: ['Date'] });

    vi.setSystemTime(new Date(T0.getTime() + 13 * DAY));
    let json = await (await cronGET(req(CRON_URL, undefined, CRON_AUTH))).json();
    expect(json.dryRun).toBe(true);
    expect(json.memberNudges.filter((n: { kind: string }) => n.kind === 'quiet')).toEqual([]);
    expect(json.coachAlerts).toEqual([]);

    vi.setSystemTime(new Date(T0.getTime() + 14 * DAY));
    json = await (await cronGET(req(CRON_URL, undefined, CRON_AUTH))).json();
    expect(json.memberNudges).toContainEqual(
      expect.objectContaining({ userId: MEMBER_A, kind: 'quiet', daysSilent: 14 })
    );
    expect(json.coachAlerts).toEqual([]);

    vi.setSystemTime(new Date(T0.getTime() + 21 * DAY));
    json = await (await cronGET(req(CRON_URL, undefined, CRON_AUTH))).json();
    expect(json.coachAlerts).toContainEqual(
      expect.objectContaining({ userId: MEMBER_A, kind: 'silent', daysSilent: 21 })
    );
    expect(json.sent).toBe(0);
    expect(state.sent).toEqual([]);
    // A dry run leaves no "already sent" marks behind.
    expect((state.plans.get(MEMBER_A)!.accountability as PlanAccountability).notified).toEqual({});
  });

  it('reports no member e-mail addresses or names in its output', async () => {
    seedDemoMember(MEMBER_C);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(T0.getTime() + 21 * DAY));
    const text = JSON.stringify(await (await cronGET(req(CRON_URL, undefined, CRON_AUTH))).json());
    expect(text).not.toContain('@example.test');
    expect(text).not.toContain('Member 3333');
  });

  it('with both flags on, sends once per nudge and marks it so a re-run does not repeat', async () => {
    seedDemoMember(MEMBER_A);
    vi.stubEnv('CARSI_COACHING_ACCOUNTABILITY_EMAILS_ENABLED', 'true');
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(T0.getTime() + 21 * DAY));
    const first = await (await cronGET(req(CRON_URL, undefined, CRON_AUTH))).json();
    expect(first.dryRun).toBe(false);
    expect(first.sent).toBeGreaterThan(0);
    const sentCount = state.sent.length;
    const again = await (await cronGET(req(CRON_URL, undefined, CRON_AUTH))).json();
    expect(again.sent).toBe(0);
    expect(state.sent.length).toBe(sentCount);
  });
});
