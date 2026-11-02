import { describe, expect, it } from 'vitest';

import {
  courseHasPrerequisites,
  decidePrerequisiteAccess,
  isAdminOverridePaymentReference,
  isStripeCheckoutPaymentReference,
  parseCoursePrerequisites,
  prerequisiteBlockedMessage,
  type PrerequisiteFacts,
} from './course-prerequisites';

const L2 = 'level-2-mould-remediation-30ee3492';
const MOULD_META = {
  designation: 'CARSI Mould Remediation Practitioner',
  prerequisites: [{ courseSlug: L2, reason: 'Applies Level 2 to whole jobs.' }],
  prerequisitesEnforcedFrom: '2026-11-02T00:00:00+11:00',
};

const facts = (completed: string[] = [], known: string[] = [L2]): PrerequisiteFacts => ({
  knownSlugs: new Set(known),
  completedSlugs: new Set(completed),
});

describe('parseCoursePrerequisites', () => {
  it('reads meta.prerequisites with reasons and the enforcement date', () => {
    const p = parseCoursePrerequisites(MOULD_META);
    expect(p.prerequisites).toEqual([{ courseSlug: L2, reason: 'Applies Level 2 to whole jobs.' }]);
    expect(p.enforcedFrom?.toISOString()).toBe('2026-11-01T13:00:00.000Z');
    expect(p.configErrors).toEqual([]);
  });

  it('honours the legacy singular meta.prerequisite and de-duplicates', () => {
    const p = parseCoursePrerequisites({ prerequisite: L2, prerequisites: [L2.toUpperCase()] });
    expect(p.prerequisites).toEqual([{ courseSlug: L2 }]);
  });

  it('reports no prerequisites for empty, null or non-object meta', () => {
    for (const meta of [null, undefined, {}, [], 'x', { prerequisites: [] }, { prerequisite: '' }]) {
      expect(courseHasPrerequisites(parseCoursePrerequisites(meta))).toBe(false);
    }
  });

  it('flags malformed config so the course fails closed', () => {
    expect(parseCoursePrerequisites({ prerequisites: 'level-2' }).configErrors).toHaveLength(1);
    expect(parseCoursePrerequisites({ prerequisites: [{ reason: 'no slug' }] }).configErrors).toHaveLength(1);
    expect(parseCoursePrerequisites({ prerequisite: 'Not A Slug!' }).configErrors).toHaveLength(1);
    expect(parseCoursePrerequisites({ prerequisites: [L2], prerequisitesEnforcedFrom: 'soon' }).configErrors)
      .toHaveLength(1);
    expect(courseHasPrerequisites(parseCoursePrerequisites({ prerequisites: 'level-2' }))).toBe(true);
  });
});

describe('decidePrerequisiteAccess — issuing a new enrolment', () => {
  const parsed = parseCoursePrerequisites(MOULD_META);

  it('no prerequisites → allowed', () => {
    const d = decidePrerequisiteAccess({ parsed: parseCoursePrerequisites({}), isAdmin: false, facts: facts() });
    expect(d).toEqual({ allowed: true, reason: 'no-prerequisites' });
  });

  it('prerequisite completed → allowed', () => {
    const d = decidePrerequisiteAccess({ parsed, isAdmin: false, facts: facts([L2]) });
    expect(d).toEqual({ allowed: true, reason: 'met' });
  });

  it('prerequisite not completed → blocked, naming the missing course', () => {
    const d = decidePrerequisiteAccess({ parsed, isAdmin: false, facts: facts([]) });
    expect(d.allowed).toBe(false);
    if (d.allowed) return;
    expect(d.reason).toBe('not-met');
    expect(d.missing.map((m) => m.courseSlug)).toEqual([L2]);
  });

  it('admin → allowed even when not completed', () => {
    const d = decidePrerequisiteAccess({ parsed, isAdmin: true, facts: facts([]) });
    expect(d).toEqual({ allowed: true, reason: 'admin' });
  });

  it('unknown prerequisite slug → fails CLOSED', () => {
    const d = decidePrerequisiteAccess({ parsed, isAdmin: false, facts: facts([], []) });
    expect(d.allowed).toBe(false);
    if (d.allowed) return;
    expect(d.reason).toBe('unknown-prerequisite');
    expect(d.unknown).toEqual([L2]);
  });

  it('malformed config → fails CLOSED even if other prerequisites are met', () => {
    const bad = parseCoursePrerequisites({ prerequisites: [L2, { reason: 'x' }] });
    const d = decidePrerequisiteAccess({ parsed: bad, isAdmin: false, facts: facts([L2]) });
    expect(d.allowed).toBe(false);
    if (d.allowed) return;
    expect(d.reason).toBe('invalid-config');
  });

  it('every prerequisite must be completed', () => {
    const two = parseCoursePrerequisites({ prerequisites: [L2, 'asbestos-awareness'] });
    const d = decidePrerequisiteAccess({
      parsed: two,
      isAdmin: false,
      facts: facts([L2], [L2, 'asbestos-awareness']),
    });
    expect(d.allowed).toBe(false);
    if (d.allowed) return;
    expect(d.missing.map((m) => m.courseSlug)).toEqual(['asbestos-awareness']);
  });
});

describe('decidePrerequisiteAccess — reading with an existing enrolment (grandfathering)', () => {
  const parsed = parseCoursePrerequisites(MOULD_META);
  const before = new Date('2026-10-01T00:00:00Z');
  const after = new Date('2026-11-05T00:00:00Z');

  it('enrolment created before prerequisitesEnforcedFrom → grandfathered', () => {
    const d = decidePrerequisiteAccess({
      parsed,
      isAdmin: false,
      facts: facts([]),
      enrolment: { status: 'active', enrolledAt: before, paymentReference: 'cs_old' },
    });
    expect(d).toEqual({ allowed: true, reason: 'grandfathered' });
  });

  it('no enforcement date → every existing enrolment is grandfathered', () => {
    const noDate = parseCoursePrerequisites({ prerequisite: L2 });
    const d = decidePrerequisiteAccess({
      parsed: noDate,
      isAdmin: false,
      facts: facts([]),
      enrolment: { status: 'active', enrolledAt: after, paymentReference: 'free' },
    });
    expect(d).toEqual({ allowed: true, reason: 'grandfathered' });
  });

  it('enrolment on/after the enforcement date without the prerequisite → blocked', () => {
    const d = decidePrerequisiteAccess({
      parsed,
      isAdmin: false,
      facts: facts([]),
      enrolment: { status: 'active', enrolledAt: after, paymentReference: 'free' },
    });
    expect(d.allowed).toBe(false);
  });

  it('enrolment on/after the enforcement date with the prerequisite completed → allowed', () => {
    const d = decidePrerequisiteAccess({
      parsed,
      isAdmin: false,
      facts: facts([L2]),
      enrolment: { status: 'active', enrolledAt: after, paymentReference: 'free' },
    });
    expect(d).toEqual({ allowed: true, reason: 'met' });
  });

  it('an admin-created enrolment is the per-learner override', () => {
    const d = decidePrerequisiteAccess({
      parsed,
      isAdmin: false,
      facts: facts([]),
      enrolment: { status: 'active', enrolledAt: after, paymentReference: 'admin:seed-catalog' },
    });
    expect(d).toEqual({ allowed: true, reason: 'admin-override' });
  });

  it('a completed enrolment of the gated course keeps its record access', () => {
    const d = decidePrerequisiteAccess({
      parsed,
      isAdmin: false,
      facts: facts([]),
      enrolment: { status: 'completed', enrolledAt: after, paymentReference: 'free' },
    });
    expect(d).toEqual({ allowed: true, reason: 'course-completed' });
  });
});

describe('payment reference helpers + message', () => {
  it('classifies references', () => {
    expect(isAdminOverridePaymentReference('admin:full-access')).toBe(true);
    expect(isAdminOverridePaymentReference('membership:x')).toBe(false);
    expect(isAdminOverridePaymentReference(null)).toBe(false);
    expect(isStripeCheckoutPaymentReference('cs_test_123')).toBe(true);
    expect(isStripeCheckoutPaymentReference('free')).toBe(false);
  });

  it('says "Complete <title> first" in Australian English', () => {
    expect(prerequisiteBlockedMessage([{ slug: L2, title: 'Level 2 — Mould Remediation' }])).toBe(
      'Complete Level 2 — Mould Remediation first. This course is locked until you have completed its prerequisite.',
    );
    expect(prerequisiteBlockedMessage([])).toMatch(/contact CARSI support/);
  });
});
