/**
 * GP-677 — every coaching portal page counts as a visit, not only Home and Progress.
 * Proves:
 * - a visit is recorded at most once per 6-hour window, and only on a plan that has
 *   accountability set up;
 * - the coaching portal layout (which wraps every member portal page) mounts the visit
 *   tracker for a subscriber while the feature flag is on, and not otherwise (the tracker
 *   itself, which fires on every page change, is tested in CoachingPortalVisitBeacon.test.tsx);
 * - a visit recorded by another page first does not hide the "you've been quiet" banner the
 *   Home card shows a member returning after 14 or more quiet days, and the banner shows once
 *   even when two views load together.
 */
import fs from 'node:fs';
import path from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applyKpiDefinitions,
  daysSilent,
  normaliseKpiDefinitions,
  type PlanAccountability,
} from '@/lib/coaching-portal/accountability';
import {
  getMyAccountability,
  recordPortalVisit,
  type AccountabilityStore,
} from '@/lib/server/carsi-coaching-accountability';

const USER = '11111111-1111-4111-8111-111111111111';
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const T0 = new Date('2026-11-01T23:00:00.000Z');

function setUp(now: Date): PlanAccountability {
  const defs = normaliseKpiDefinitions([
    { label: 'Quotes sent' },
    { label: 'Jobs won' },
    { label: 'Reviews' },
  ]);
  if (!defs.ok) throw new Error('fixture');
  return applyKpiDefinitions(null, defs.kpis, 'coach-phill-mcgurk', now);
}

function memoryStore(initial: PlanAccountability | null) {
  const box = { acc: initial, version: 1, writes: 0 };
  const store: AccountabilityStore = {
    async readPlan(userId) {
      if (!box.acc) return null;
      return { userId, goals: [], accountability: box.acc, version: String(box.version) };
    },
    async writeAccountability(_userId, acc, _goals, expected) {
      if (expected !== String(box.version)) return false;
      box.acc = acc;
      box.version += 1;
      box.writes += 1;
      return true;
    },
    async listActions() {
      return [];
    },
    async listMembers() {
      return [];
    },
  };
  return { store, box };
}

describe('recordPortalVisit', () => {
  it('records a visit, then not again inside the 6-hour window, then again after it', async () => {
    const { store, box } = memoryStore(setUp(T0));
    const later = new Date(T0.getTime() + 7 * HOUR);

    await recordPortalVisit(store, USER, later);
    expect(box.writes).toBe(1);
    expect(box.acc?.lastSeenAt).toBe(later.toISOString());

    await recordPortalVisit(store, USER, new Date(later.getTime() + 5 * HOUR));
    expect(box.writes).toBe(1);

    const next = new Date(later.getTime() + 6 * HOUR);
    await recordPortalVisit(store, USER, next);
    expect(box.writes).toBe(2);
    expect(box.acc?.lastSeenAt).toBe(next.toISOString());
  });

  it('writes nothing for a member with no accountability set up', async () => {
    const { store, box } = memoryStore(null);
    await recordPortalVisit(store, USER, T0);
    expect(box.writes).toBe(0);
    expect(box.acc).toBeNull();
  });

  it('resets the quiet clock that drives the day-14 nudge and day-21 coach alert', async () => {
    const { store, box } = memoryStore(setUp(T0));
    const back = new Date(T0.getTime() + 20 * DAY);
    expect(daysSilent(box.acc!, back)).toBe(20);
    await recordPortalVisit(store, USER, back);
    expect(daysSilent(box.acc!, back)).toBe(0);
  });

  it('two pages recording together write once', async () => {
    const { store, box } = memoryStore(setUp(T0));
    const back = new Date(T0.getTime() + 15 * DAY);
    await Promise.all([recordPortalVisit(store, USER, back), recordPortalVisit(store, USER, back)]);
    expect(box.writes).toBe(1);
    expect(box.acc?.quietReturn).toEqual({ daysSilent: 15, at: back.toISOString() });
  });
});

describe('the quiet banner after another page has already recorded the visit', () => {
  it('still tells a member returning after 15 quiet days, once', async () => {
    const { store, box } = memoryStore(setUp(T0));
    const back = new Date(T0.getTime() + 15 * DAY);

    // The member opens Actions first (visit recorded), then the Home card asks the API.
    await recordPortalVisit(store, USER, back);
    const view = await getMyAccountability(store, USER, new Date(back.getTime() + 60_000));
    expect(view.quiet).toEqual({ daysSilent: 15 });
    expect(box.acc?.quietReturn).toBeUndefined();

    // Shown once: the next view in the same window has no banner.
    const again = await getMyAccountability(store, USER, new Date(back.getTime() + 120_000));
    expect(again.quiet).toBeNull();
  });

  it('shows the banner once when two views load together', async () => {
    const { store } = memoryStore(setUp(T0));
    const back = new Date(T0.getTime() + 15 * DAY);
    await recordPortalVisit(store, USER, back);
    const at = new Date(back.getTime() + 60_000);
    const views = await Promise.all([
      getMyAccountability(store, USER, at),
      getMyAccountability(store, USER, at),
    ]);
    expect(views.filter((v) => v.quiet !== null)).toHaveLength(1);
  });

  it('shows the banner once when the Home card itself is the first view', async () => {
    const { store } = memoryStore(setUp(T0));
    const back = new Date(T0.getTime() + 15 * DAY);
    const views = await Promise.all([
      getMyAccountability(store, USER, back),
      getMyAccountability(store, USER, back),
    ]);
    expect(views.filter((v) => v.quiet !== null)).toHaveLength(1);
  });

  it('drops an unseen quiet mark once the visit window has passed', async () => {
    const { store } = memoryStore(setUp(T0));
    const back = new Date(T0.getTime() + 15 * DAY);
    // Opened only the Actions page; the Home card is not looked at until the next day.
    await recordPortalVisit(store, USER, back);
    const later = await getMyAccountability(store, USER, new Date(back.getTime() + 7 * HOUR));
    expect(later.quiet).toBeNull();
  });

  it('shows no banner when the member was away less than 14 days', async () => {
    const { store } = memoryStore(setUp(T0));
    const back = new Date(T0.getTime() + 13 * DAY);
    await recordPortalVisit(store, USER, back);
    const view = await getMyAccountability(store, USER, back);
    expect(view.quiet).toBeNull();
  });

  it('keeps the banner when the Home card is the first thing to record the visit', async () => {
    const { store, box } = memoryStore(setUp(T0));
    const back = new Date(T0.getTime() + 15 * DAY);
    const view = await getMyAccountability(store, USER, back);
    expect(view.quiet).toEqual({ daysSilent: 15 });
    expect(box.acc?.lastSeenAt).toBe(back.toISOString());
  });
});

// ---------------------------------------------------------------------------------------------
// The layout that wraps every member portal page
// ---------------------------------------------------------------------------------------------

const layoutState = vi.hoisted(() => ({
  claims: null as { sub: string } | null,
  entitled: true,
  flag: true,
}));

vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));

vi.mock('@/lib/server/session-server', () => ({
  getServerSessionClaims: async () => layoutState.claims,
}));

vi.mock('@/lib/server/carsi-coaching-portal-dashboard', () => ({
  loadCoachingPortalDashboard: async () => ({ access: { entitled: layoutState.entitled } }),
}));

vi.mock('@/components/coaching-portal/CoachingPortalShell', () => ({
  CoachingPortalShell: ({ children }: { children: unknown }) => children,
}));

vi.mock('@/components/coaching-portal/CoachingPortalVisitBeacon', () => ({
  CoachingPortalVisitBeacon: function CoachingPortalVisitBeacon() {
    return null;
  },
}));

vi.mock('@/lib/server/carsi-coaching-accountability-flag', () => ({
  isCarsiCoachingAccountabilityEnabled: () => layoutState.flag,
  isCarsiCoachingAccountabilityEmailEnabled: () => false,
}));

/** True when the rendered tree contains the visit tracker. */
function hasBeacon(node: unknown): boolean {
  if (!node || typeof node !== 'object') return false;
  if (Array.isArray(node)) return node.some(hasBeacon);
  const el = node as { type?: { name?: string }; props?: { children?: unknown } };
  if (el.type?.name === 'CoachingPortalVisitBeacon') return true;
  return hasBeacon(el.props?.children);
}

describe('coaching portal layout', () => {
  beforeEach(() => {
    layoutState.claims = { sub: USER };
    layoutState.entitled = true;
    layoutState.flag = true;
  });

  async function renderLayout() {
    const { default: Layout } =
      await import('../../../app/(coaching-portal)/dashboard/coaching/layout');
    return Layout({ children: 'page' });
  }

  it('mounts the visit tracker for a subscriber while the flag is on', async () => {
    expect(hasBeacon(await renderLayout())).toBe(true);
  });

  it('does not mount it while the feature flag is off', async () => {
    layoutState.flag = false;
    expect(hasBeacon(await renderLayout())).toBe(false);
  });

  it('does not mount it for a signed-in user without an active subscription', async () => {
    layoutState.entitled = false;
    expect(hasBeacon(await renderLayout())).toBe(false);
  });

  it('wraps every member portal page, so no page is left out', () => {
    const root = path.join(process.cwd(), 'app/(coaching-portal)');
    const pages: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name === 'page.tsx') pages.push(path.relative(root, p));
      }
    };
    walk(root);
    expect(pages.length).toBeGreaterThan(5);
    for (const p of pages) {
      expect(p.startsWith(path.join('dashboard', 'coaching')), p).toBe(true);
    }
  });
});
