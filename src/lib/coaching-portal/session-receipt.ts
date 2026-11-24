/** Parse coach-written decisions from a completed session (stored as JSON string array). */
export function parseSessionDecisions(decisionsJson: string | null | undefined): string[] {
  if (!decisionsJson?.trim()) return [];
  try {
    const parsed = JSON.parse(decisionsJson) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((d): d is string => typeof d === 'string' && d.trim().length > 0);
  } catch {
    return [];
  }
}

export function formatFollowUpDate(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export type SessionReceiptView = {
  id: string;
  scheduledAt: string;
  coachName: string;
  summary: string | null;
  decisions: string[];
  followUpLabel: string | null;
  status: string;
};

export function buildSessionReceiptView(row: {
  id: string;
  scheduledAt: string;
  coachName: string;
  customerSummary: string | null;
  decisionsJson: string | null;
  followUpAt: string | null;
  status: string;
}): SessionReceiptView {
  return {
    id: row.id,
    scheduledAt: row.scheduledAt,
    coachName: row.coachName,
    summary: row.customerSummary,
    decisions: parseSessionDecisions(row.decisionsJson),
    followUpLabel: formatFollowUpDate(row.followUpAt),
    status: row.status,
  };
}

export function isPastSession(
  row: { scheduledAt: string; status: string },
  now: Date = new Date()
): boolean {
  if (row.status === 'completed') return true;
  return new Date(row.scheduledAt).getTime() < now.getTime();
}