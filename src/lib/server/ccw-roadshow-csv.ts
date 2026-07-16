import type { RegistryRow } from './ccw-roadshow-registry';

const HEADER = [
  'event',
  'status',
  'company',
  'contact_email',
  'contact_phone',
  'ccw_status',
  'calendar_synced',
  // Email delivery — 'never_attempted' means no send was ever recorded for this
  // registration, which is the answer to "was this person emailed?".
  'email_status',
  'email_kind',
  'email_last_attempt',
  'email_failure_reason',
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
        row.email?.lastStatus ?? 'never_attempted',
        row.email?.lastKind ?? '',
        row.email?.lastAttemptAt ? row.email.lastAttemptAt.toISOString() : '',
        row.email?.failureReason ?? '',
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
