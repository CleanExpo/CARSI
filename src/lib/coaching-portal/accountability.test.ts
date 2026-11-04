/**
 * GP-635 (Coaching advantage A8) — accountability on autopilot. Pure rules, no database.
 *
 * The "Done when" of GP-635 is the time-shifted block below: a demo member misses their
 * check-in, the quiet nudge appears on day 14 (not day 13) and the coach alert on day 21
 * (not day 20).
 */
import { describe, expect, it } from 'vitest';

import {
  ACCOUNTABILITY_COPY,
  CHECKIN_HISTORY_MAX,
  actionCompletionRate,
  applyCheckIn,
  applyKpiDefinitions,
  checkInStreak,
  coachAlerts,
  daysSilent,
  fortnightPeriodStart,
  isCheckInDue,
  kpiTrend,
  memberNudges,
  normaliseCheckInValues,
  normaliseKpiDefinitions,
  parseGrowthPlanGoals,
  serialiseGrowthPlanGoals,
  type AccountabilityAction,
  type PlanAccountability,
} from '@/lib/coaching-portal/accountability';

const DAY = 86_400_000;
const COACH = 'coach-phill-mcgurk';
// Monday 2 Nov 2026, 9:00 am AEST (UTC+10, no daylight saving in Brisbane).
const T0 = new Date('2026-11-01T23:00:00.000Z');
const at = (days: number) => new Date(T0.getTime() + days * DAY);

const KPIS = [{ label: 'Quotes sent' }, { label: 'Jobs won' }, { label: 'Google reviews' }];

function demoMember(): PlanAccountability {
  const defs = normaliseKpiDefinitions(KPIS);
  if (!defs.ok) throw new Error('fixture');
  return applyKpiDefinitions(null, defs.kpis, COACH, T0);
}

function action(partial: Partial<AccountabilityAction>): AccountabilityAction {
  return {
    id: partial.id ?? 'a1',
    title: partial.title ?? 'Call back every retail quote',
    status: partial.status ?? 'todo',
    dueDate: partial.dueDate ?? null,
    goalId: partial.goalId ?? null,
    assignedTo: partial.assignedTo ?? 'customer',
    completedAt: partial.completedAt ?? null,
  };
}

describe('growth plan goals_json stays backwards compatible', () => {
  it('reads the legacy goals array with no accountability', () => {
    const legacy = JSON.stringify([{ id: 'g1', title: 'One more direct job a week' }]);
    const doc = parseGrowthPlanGoals(legacy);
    expect(doc.goals).toEqual([{ id: 'g1', title: 'One more direct job a week' }]);
    expect(doc.accountability).toBeNull();
    // Writing it back without accountability keeps the exact legacy shape.
    expect(serialiseGrowthPlanGoals(doc)).toBe(legacy);
  });

  it('round-trips goals and accountability together', () => {
    const acc = demoMember();
    const json = serialiseGrowthPlanGoals({ goals: [{ id: 'g1' }], accountability: acc });
    const back = parseGrowthPlanGoals(json);
    expect(back.goals).toEqual([{ id: 'g1' }]);
    expect(back.accountability).toEqual(acc);
  });

  it('treats null, junk and wrong shapes as empty rather than throwing', () => {
    for (const raw of [null, '', 'not json', '42', '{"accountability":"x"}']) {
      const doc = parseGrowthPlanGoals(raw);
      expect(doc.accountability, String(raw)).toBeNull();
    }
  });
});

describe('KPI definitions (3 to 5, set with the plan)', () => {
  it('accepts three to five named KPIs', () => {
    const r = normaliseKpiDefinitions(KPIS);
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(r.kpis.map((k) => k.label)).toEqual(['Quotes sent', 'Jobs won', 'Google reviews']);
  });

  it('rejects fewer than three, more than five, blanks and duplicates', () => {
    expect(normaliseKpiDefinitions(KPIS.slice(0, 2)).ok).toBe(false);
    expect(
      normaliseKpiDefinitions([...KPIS, ...KPIS.map((k) => ({ label: `${k.label} 2` }))]).ok
    ).toBe(false);
    expect(normaliseKpiDefinitions([...KPIS.slice(0, 2), { label: '  ' }]).ok).toBe(false);
    expect(normaliseKpiDefinitions([...KPIS.slice(0, 2), { label: 'quotes SENT' }]).ok).toBe(false);
    expect(normaliseKpiDefinitions('nope').ok).toBe(false);
  });

  it('keeps a KPI id stable when its label is unchanged, so its history survives an edit', () => {
    const acc = demoMember();
    const quotesId = acc.kpis[0]!.id;
    const edited = normaliseKpiDefinitions([
      { id: quotesId, label: 'Quotes sent' },
      { label: 'Jobs won' },
      { label: 'Average job value' },
    ]);
    expect(edited.ok).toBe(true);
    if (!edited.ok) return;
    const next = applyKpiDefinitions(acc, edited.kpis, COACH, at(3));
    expect(next.kpis[0]!.id).toBe(quotesId);
    expect(next.startedAt).toBe(acc.startedAt);
  });
});

describe('(a) fortnightly check-in saves KPIs and the streak counts consecutive fortnights', () => {
  it('saves every KPI value against the current fortnight', () => {
    const acc = demoMember();
    const values = normaliseCheckInValues(acc.kpis, {
      [acc.kpis[0]!.id]: 12,
      [acc.kpis[1]!.id]: '4',
      [acc.kpis[2]!.id]: 2,
    });
    expect(values.ok).toBe(true);
    if (!values.ok) return;
    const next = applyCheckIn(acc, values.values, at(1));
    expect(next.checkIns).toHaveLength(1);
    expect(next.checkIns[0]!.period).toBe(fortnightPeriodStart(at(1)));
    expect(next.checkIns[0]!.values).toEqual({
      [acc.kpis[0]!.id]: 12,
      [acc.kpis[1]!.id]: 4,
      [acc.kpis[2]!.id]: 2,
    });
    expect(isCheckInDue(next, at(2))).toBe(false);
  });

  it('refuses a check-in with a missing, negative or non-numeric value', () => {
    const acc = demoMember();
    const [k1, k2, k3] = acc.kpis.map((k) => k.id);
    expect(normaliseCheckInValues(acc.kpis, { [k1!]: 1, [k2!]: 2 }).ok).toBe(false);
    expect(normaliseCheckInValues(acc.kpis, { [k1!]: 1, [k2!]: -2, [k3!]: 1 }).ok).toBe(false);
    expect(normaliseCheckInValues(acc.kpis, { [k1!]: 1, [k2!]: 'lots', [k3!]: 1 }).ok).toBe(false);
    expect(normaliseCheckInValues(acc.kpis, null).ok).toBe(false);
  });

  it('a second check-in in the same fortnight replaces the first, not a second entry', () => {
    let acc = demoMember();
    const ids = acc.kpis.map((k) => k.id);
    acc = applyCheckIn(acc, Object.fromEntries(ids.map((id) => [id, 1])), at(1));
    acc = applyCheckIn(acc, Object.fromEntries(ids.map((id) => [id, 5])), at(3));
    expect(acc.checkIns).toHaveLength(1);
    expect(acc.checkIns[0]!.values[ids[0]!]).toBe(5);
  });

  it('fortnights are fixed 14-day windows in Australian (Brisbane) time', () => {
    const p = fortnightPeriodStart(T0);
    expect(fortnightPeriodStart(at(13))).toBe(p);
    expect(fortnightPeriodStart(at(14))).not.toBe(p);
    expect(p).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('counts consecutive fortnights and resets after a missed one', () => {
    let acc = demoMember();
    const vals = Object.fromEntries(acc.kpis.map((k) => [k.id, 3]));
    for (const d of [0, 14, 28]) acc = applyCheckIn(acc, vals, at(d));
    expect(checkInStreak(acc.checkIns, at(28))).toBe(3);
    // Still 3 early in the next fortnight: the streak is alive until that fortnight ends.
    expect(checkInStreak(acc.checkIns, at(43))).toBe(3);
    // Fortnight at day 42 missed entirely → by day 56 the streak is broken.
    expect(checkInStreak(acc.checkIns, at(56))).toBe(0);
    acc = applyCheckIn(acc, vals, at(57));
    expect(checkInStreak(acc.checkIns, at(57))).toBe(1);
  });

  it('keeps a bounded history so the plan row cannot grow without limit', () => {
    let acc = demoMember();
    const vals = Object.fromEntries(acc.kpis.map((k) => [k.id, 1]));
    for (let i = 0; i < CHECKIN_HISTORY_MAX + 5; i += 1) acc = applyCheckIn(acc, vals, at(i * 14));
    expect(acc.checkIns).toHaveLength(CHECKIN_HISTORY_MAX);
    expect(acc.checkIns.at(-1)!.period).toBe(
      fortnightPeriodStart(at((CHECKIN_HISTORY_MAX + 4) * 14))
    );
  });

  it('builds a KPI trend per fortnight, oldest first, for the chart', () => {
    let acc = demoMember();
    const [q] = acc.kpis.map((k) => k.id);
    const vals = (n: number) => Object.fromEntries(acc.kpis.map((k) => [k.id, n]));
    acc = applyCheckIn(acc, vals(4), at(0));
    acc = applyCheckIn(acc, vals(9), at(14));
    const trend = kpiTrend(acc);
    expect(trend.map((p) => p[q!])).toEqual([4, 9]);
    expect(trend[0]!.period < trend[1]!.period).toBe(true);
  });
});

describe('progress: action completion rate', () => {
  it('counts the member’s own actions only, and handles none', () => {
    expect(actionCompletionRate([])).toEqual({ done: 0, total: 0, percent: 0 });
    const r = actionCompletionRate([
      action({ id: '1', status: 'done' }),
      action({ id: '2', status: 'todo' }),
      action({ id: '3', status: 'blocked' }),
      action({ id: '4', status: 'done' }),
      // A question waiting on the coach is not the member's action.
      action({ id: '5', status: 'todo', assignedTo: 'coach' }),
    ]);
    expect(r).toEqual({ done: 2, total: 4, percent: 50 });
  });
});

describe('(b) time-shifted: demo member misses a check-in → day-14 nudge, day-21 coach alert', () => {
  const acc = demoMember(); // KPIs set on day 0, then silence: no visit, no check-in.

  it('day 13: no quiet nudge and no coach alert yet', () => {
    expect(daysSilent(acc, at(13))).toBe(13);
    expect(
      memberNudges({ accountability: acc, actions: [], now: at(13) }).map((n) => n.kind)
    ).not.toContain('quiet');
    expect(coachAlerts({ accountability: acc, actions: [], now: at(13) })).toEqual([]);
  });

  it('day 14: the "you have been quiet" nudge fires, still no coach alert', () => {
    const nudges = memberNudges({ accountability: acc, actions: [], now: at(14) });
    expect(nudges.map((n) => n.kind)).toContain('quiet');
    expect(nudges.find((n) => n.kind === 'quiet')!.daysSilent).toBe(14);
    expect(coachAlerts({ accountability: acc, actions: [], now: at(14) })).toEqual([]);
  });

  it('day 20: still no coach alert', () => {
    expect(coachAlerts({ accountability: acc, actions: [], now: at(20) })).toEqual([]);
  });

  it('day 21: the coach alert fires for silence', () => {
    const alerts = coachAlerts({ accountability: acc, actions: [], now: at(21) });
    expect(alerts).toEqual([{ kind: 'silent', daysSilent: 21, key: expect.any(String) }]);
  });

  it('a check-in or a portal visit resets the silence clock', () => {
    const vals = Object.fromEntries(acc.kpis.map((k) => [k.id, 1]));
    const checkedIn = applyCheckIn(acc, vals, at(10));
    expect(daysSilent(checkedIn, at(21))).toBe(11);
    expect(coachAlerts({ accountability: checkedIn, actions: [], now: at(21) })).toEqual([]);
    const visited = { ...acc, lastSeenAt: at(18).toISOString() };
    expect(
      memberNudges({ accountability: visited, actions: [], now: at(21) }).map((n) => n.kind)
    ).not.toContain('quiet');
  });

  it('the fortnightly check-in prompt is due when this fortnight has none', () => {
    expect(isCheckInDue(acc, at(1))).toBe(true);
    expect(
      memberNudges({ accountability: acc, actions: [], now: at(1) }).map((n) => n.kind)
    ).toContain('checkin_due');
  });
});

describe('due-soon and overdue action reminders', () => {
  const acc = demoMember();
  it('flags open actions due within two days and overdue ones, ignoring done and coach-owned', () => {
    const nudges = memberNudges({
      accountability: acc,
      now: at(10),
      actions: [
        action({ id: 'soon', dueDate: at(11.5) }),
        action({ id: 'late', status: 'in_progress', dueDate: at(8) }),
        action({ id: 'later', dueDate: at(20) }),
        action({ id: 'done-late', status: 'done', dueDate: at(5) }),
        action({ id: 'coach', assignedTo: 'coach', dueDate: at(5) }),
      ],
    });
    expect(nudges.filter((n) => n.kind === 'action_due_soon').map((n) => n.actionId)).toEqual([
      'soon',
    ]);
    expect(nudges.filter((n) => n.kind === 'action_overdue').map((n) => n.actionId)).toEqual([
      'late',
    ]);
  });
});

describe('(c) two blocked actions on the same goal raise a coach alert', () => {
  const acc = demoMember();
  it('alerts once per goal with two or more blocked actions', () => {
    const alerts = coachAlerts({
      accountability: acc,
      now: at(2),
      actions: [
        action({ id: '1', status: 'blocked', goalId: 'g1' }),
        action({ id: '2', status: 'blocked', goalId: 'g1' }),
        action({ id: '3', status: 'blocked', goalId: 'g2' }),
        action({ id: '4', status: 'todo', goalId: 'g2' }),
      ],
    });
    expect(alerts).toEqual([
      { kind: 'blocked_goal', goalId: 'g1', blockedCount: 2, key: expect.any(String) },
    ]);
  });

  it('does not alert for blocked actions with no goal, or one per goal', () => {
    const alerts = coachAlerts({
      accountability: acc,
      now: at(2),
      actions: [
        action({ id: '1', status: 'blocked', goalId: null }),
        action({ id: '2', status: 'blocked', goalId: null }),
        action({ id: '3', status: 'blocked', goalId: 'g3' }),
      ],
    });
    expect(alerts).toEqual([]);
  });
});

describe('(e) no accountability on the plan means nothing to nudge or alert', () => {
  it('returns no nudges and no alerts', () => {
    expect(memberNudges({ accountability: null, actions: [], now: at(30) })).toEqual([]);
    expect(coachAlerts({ accountability: null, actions: [], now: at(30) })).toEqual([]);
  });
});

/** Every copy string, with each template function rendered (JSON.stringify drops functions). */
function allCopy(node: unknown): string[] {
  if (typeof node === 'string') return [node];
  if (typeof node === 'function')
    return [String((node as (...a: unknown[]) => unknown)('Sam', 14))];
  if (node && typeof node === 'object') return Object.values(node).flatMap(allCopy);
  return [];
}

describe('(f) compliance copy guard', () => {
  it('renders the template functions too, so the guard can see them', () => {
    expect(allCopy(ACCOUNTABILITY_COPY).join('\n')).toContain('14 days since');
  });

  it('member and coach copy makes no certification, accreditation or CEC claim', () => {
    const all = allCopy(ACCOUNTABILITY_COPY).join('\n');
    expect(all.length).toBeGreaterThan(200);
    expect(all).not.toMatch(
      /\bIICRC\b|\bCECs?\b|accredit|certif|continuing education|approved by/i
    );
  });

  it('copy is plain Australian English (no US spellings in the common traps)', () => {
    const all = allCopy(ACCOUNTABILITY_COPY).join('\n');
    expect(all).not.toMatch(/\b(color|organize|prioritize|behavior|program)\b/i);
  });
});
