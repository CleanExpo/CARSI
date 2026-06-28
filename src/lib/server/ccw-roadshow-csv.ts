import type { RegistryRow } from './ccw-roadshow-registry';

const HEADER = [
  'event',
  'status',
  'company',
  'contact_email',
  'contact_phone',
  'ccw_status',
  'calendar_synced',
  'attendee_name',
  'years_experience',
  'goals',
  'token',
  'registered_at',
];

function escapeCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function registryToCsv(rows: RegistryRow[]): string {
  const lines = [HEADER.join(',')];

  for (const row of rows) {
    for (const attendee of row.attendees) {
      const cells = [
        row.eventSlug,
        row.status,
        row.companyName ?? '',
        row.contactEmail,
        row.contactPhone ?? '',
        row.ccwCustomerStatus ?? '',
        row.calendarSynced ? 'true' : 'false',
        attendee.fullName,
        attendee.yearsExperience,
        attendee.goals,
        row.freeEntryToken,
        row.createdAt.toISOString(),
      ];
      lines.push(cells.map((c) => escapeCell(String(c))).join(','));
    }
  }

  return lines.join('\n') + '\n';
}
