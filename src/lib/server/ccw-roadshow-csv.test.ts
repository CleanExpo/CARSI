import { describe, expect, it } from 'vitest';
import { registryToCsv } from './ccw-roadshow-csv';
import type { RegistryRow } from './ccw-roadshow-registry';

const row: RegistryRow = {
  registrationId: 'r1',
  eventSlug: 'melbourne',
  status: 'confirmed',
  freeEntryToken: 'CCW-FREE-MEL-ABCD1234',
  companyName: 'Acme, Pty',
  contactEmail: 'boss@acme.test',
  contactPhone: '0400000000',
  ccwCustomerStatus: 'current',
  seatCount: 2,
  calendarSynced: true,
  createdAt: new Date('2026-06-22T00:00:00.000Z'),
  attendees: [
    { fullName: 'Jane Smith', yearsExperience: '2-5', goals: 'Quote with confidence' },
    { fullName: 'John Doe', yearsExperience: '0-1', goals: 'Learn tile cleaning' },
  ],
};

describe('registryToCsv', () => {
  it('writes a header plus one row per attendee', () => {
    const csv = registryToCsv([row]);
    const lines = csv.trim().split('\n');
    expect(lines).toHaveLength(3); // header + 2 attendees
    expect(lines[0]).toContain('attendee_name');
    expect(lines[0]).toContain('calendar_synced');
    expect(lines[1]).toContain(',true,');
    expect(lines[1]).toContain('Jane Smith');
    expect(lines[2]).toContain('John Doe');
  });

  it('quotes and escapes fields containing commas or quotes', () => {
    const csv = registryToCsv([row]);
    expect(csv).toContain('"Acme, Pty"');
  });

  it('returns only a header for no rows', () => {
    expect(registryToCsv([]).trim().split('\n')).toHaveLength(1);
  });
});
