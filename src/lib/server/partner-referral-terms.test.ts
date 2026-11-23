/**
 * GP-767: partners are generic database rows with versioned reward terms. The migration seeds
 * every partner the code accepts, each with a version-1 terms row, so a sale can never name a
 * partner that has no record. CCW starts on Option A (10% commission, no customer discount)
 * until Phill confirms CCW's choice.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { REFERRAL_PARTNERS } from '@/lib/partners/referral-partners';

const MIGRATION = readFileSync(
  path.join(process.cwd(), 'prisma/migrations/20261122120000_partner_referral_sales/migration.sql'),
  'utf8'
);

function compact(sql: string): string {
  return sql.replace(/\s+/g, ' ');
}

describe('referral partner seed (GP-767)', () => {
  it('seeds a partner row for every partner id the code accepts', () => {
    for (const id of Object.keys(REFERRAL_PARTNERS)) {
      expect(compact(MIGRATION)).toContain(`INSERT INTO "referral_partners" ("id", "name") VALUES ('${id}',`);
    }
  });

  it('seeds CCW terms version 1 as Option A: 10% commission, no discount', () => {
    expect(compact(MIGRATION)).toContain(
      `VALUES ('ccw', 1, 'A', 1000, 0, TIMESTAMPTZ '2026-11-22 00:00:00+10:00', NULL)`
    );
  });

  it('allows only the two reward options, and their rates', () => {
    const sql = compact(MIGRATION);
    expect(sql).toContain(`CHECK ("reward_option" IN ('A', 'B'))`);
    expect(sql).toContain(`("reward_option" = 'A' AND "commission_rate_bps" = 1000 AND "discount_rate_bps" = 0)`);
    expect(sql).toContain(`("reward_option" = 'B' AND "commission_rate_bps" = 500 AND "discount_rate_bps" = 500)`);
  });
});
