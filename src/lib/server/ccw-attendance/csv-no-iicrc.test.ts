import { describe, expect, it } from 'vitest';

import { registryToCsv } from '@/lib/server/ccw-roadshow-csv';
import type { RegistryRow } from '@/lib/server/ccw-roadshow-registry';

/**
 * AC#15(9) — the IICRC registration number must NEVER appear in the GENERAL
 * roadshow CSV export. It belongs only on the CEC-facing admin sign-in roster.
 * This guards against a future regression adding it to this export path.
 */
const row: RegistryRow = {
  registrationId: 'r1',
  eventSlug: 'melbourne',
  status: 'confirmed',
  freeEntryToken: 'CCW-FREE-1',
  companyName: 'Acme Cleaning',
  contactEmail: 'a@x.com',
  contactPhone: '0400000000',
  ccwCustomerStatus: 'current',
  seatCount: 1,
  calendarSynced: true,
  createdAt: new Date('2026-07-01T00:00:00Z'),
  attendees: [{ fullName: 'Ann Jones', yearsExperience: '2-5', goals: 'grow' }],
};

describe('registryToCsv — no IICRC leakage', () => {
  it('neither the header nor any cell mentions iicrc', () => {
    const csv = registryToCsv([row]).toLowerCase();
    expect(csv).not.toContain('iicrc');
    expect(csv).not.toContain('cec');
  });
});
