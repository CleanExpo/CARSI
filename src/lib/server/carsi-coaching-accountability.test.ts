/**
 * GP-635 server rules with an in-memory store.
 * Codex r1 P1: a KPI edit landing between a check-in's validation read and its write must
 * not store the check-in against KPI ids the plan no longer has.
 */
import { describe, expect, it } from 'vitest';

import {
  applyKpiDefinitions,
  normaliseKpiDefinitions,
  type PlanAccountability,
} from '@/lib/coaching-portal/accountability';
import {
  submitMyCheckIn,
  type AccountabilityStore,
} from '@/lib/server/carsi-coaching-accountability';

const USER = '11111111-1111-4111-8111-111111111111';
const T0 = new Date('2026-11-01T23:00:00.000Z');

function kpis(labels: string[]): PlanAccountability {
  const defs = normaliseKpiDefinitions(labels.map((label) => ({ label })));
  if (!defs.ok) throw new Error('fixture');
  return applyKpiDefinitions(null, defs.kpis, 'coach-phill-mcgurk', T0);
}

describe('submitMyCheckIn under a concurrent KPI change', () => {
  it('refuses rather than storing values under KPI ids the plan no longer has', async () => {
    const oldAcc = kpis(['Old one', 'Old two', 'Old three']);
    const newAcc = kpis(['New one', 'New two', 'New three']);
    // A real compare-and-set store: version bumps on every write.
    let current: PlanAccountability = oldAcc;
    let version = 1;
    let reads = 0;
    let checkInWrites = 0;
    const store: AccountabilityStore = {
      async readPlan(userId) {
        reads += 1;
        const snapshot = { userId, goals: [], accountability: current, version: String(version) };
        if (reads === 1) {
          // The member's KPI edit commits right after this check-in's first read.
          current = newAcc;
          version += 1;
        }
        return snapshot;
      },
      async writeAccountability(_userId, acc, _goals, expected) {
        if (expected !== String(version)) return false;
        if (acc.checkIns.length > 0) checkInWrites += 1;
        current = acc;
        version += 1;
        return true;
      },
      async listActions() {
        return [];
      },
      async listMembers() {
        return [];
      },
    };

    const values = Object.fromEntries(oldAcc.kpis.map((k) => [k.id, 5]));
    const outcome = await submitMyCheckIn(store, USER, values, T0);

    expect(outcome.status).toBe('invalid');
    expect(checkInWrites).toBe(0);
    expect(current.checkIns).toEqual([]);
    expect(current.kpis.map((k) => k.label)).toEqual(['New one', 'New two', 'New three']);
  });
});
