/**
 * Send-and-record wrapper for CCW roadshow attendee emails.
 *
 * THE BUG THIS FIXES
 * ------------------
 * `sendEmail()` (src/lib/server/email.ts) reports failure by RETURNING
 * `{ sent: false, reason }` — it does not throw. Callers wrapped the send in
 * try/catch and discarded the return value, so the two most likely failures
 * (`not_configured`, `provider_error`) produced:
 *   - no thrown error  -> the catch never ran
 *   - no record        -> nothing in the DB
 *   - a success response -> the admin was told the promotion worked
 *
 * Every roadshow email now goes through `sendAndLogRoadshowEmail`, which inspects
 * the returned result and writes one CcwRoadshowEmailLog row per attempt.
 * The caller gets the real outcome back and can surface it.
 */
import { prisma } from '@/lib/prisma';
import { sendCcwRoadshowRegistrationEmail } from '@/lib/server/transactional-email';
import type { RoadshowEmailKind } from '@/lib/server/ccw-roadshow-registration-email';

export type RoadshowEmailOutcome = {
  /** True only when the provider actually accepted the message. */
  sent: boolean;
  /** SendEmailResult.reason — why it didn't send, or 'dev_console'. */
  reason?: string;
  providerMessageId?: string;
};

export type SendAndLogInput = {
  registrationId: string;
  to: string;
  kind: RoadshowEmailKind;
  attendeeName: string;
  eventCity: string;
  dateRangeLabel: string;
  timeLabel: string;
  venueName: string;
  venueAddress: string;
  seatCount: number;
  freeEntryToken: string;
  appOrigin: string;
};

/** 'dev_console' means we deliberately didn't hit the provider — not a failure. */
function classify(sent: boolean, reason?: string): 'sent' | 'failed' | 'skipped' {
  if (reason === 'dev_console') return 'skipped';
  return sent ? 'sent' : 'failed';
}

async function writeLog(input: {
  registrationId: string;
  kind: RoadshowEmailKind;
  recipientEmail: string;
  deliveryStatus: 'sent' | 'failed' | 'skipped';
  failureReason?: string;
  providerMessageId?: string;
}): Promise<void> {
  try {
    await prisma.ccwRoadshowEmailLog.create({
      data: {
        registrationId: input.registrationId,
        kind: input.kind,
        recipientEmail: input.recipientEmail,
        deliveryStatus: input.deliveryStatus,
        failureReason: input.failureReason ?? null,
        providerMessageId: input.providerMessageId ?? null,
        sentAt: input.deliveryStatus === 'sent' ? new Date() : null,
      },
    });
  } catch (err) {
    // Never let logging break a registration. But do make it loud — a missing log
    // row is exactly the blind spot this module exists to close.
    console.error('[ccw-roadshow-email] FAILED TO WRITE EMAIL LOG', {
      registrationId: input.registrationId,
      kind: input.kind,
      deliveryStatus: input.deliveryStatus,
      err,
    });
  }
}

/**
 * Send a roadshow email and record the attempt. Never throws — the outcome is
 * returned so the caller can surface it to the admin.
 */
export async function sendAndLogRoadshowEmail(
  input: SendAndLogInput,
): Promise<RoadshowEmailOutcome> {
  const { registrationId, ...emailParams } = input;

  let sent = false;
  let reason: string | undefined;
  let providerMessageId: string | undefined;

  try {
    const result = await sendCcwRoadshowRegistrationEmail(emailParams);
    sent = result.sent;
    reason = result.reason;
    providerMessageId = result.messageId;
  } catch (err) {
    // sendEmail() shouldn't throw, but a template/network fault could.
    sent = false;
    reason = err instanceof Error ? `threw: ${err.message}` : 'threw: unknown';
  }

  const deliveryStatus = classify(sent, reason);

  if (deliveryStatus === 'failed') {
    // WS6: never log recipient addresses (PII) in prod.
    console.error('[ccw-roadshow-email] SEND FAILED', {
      registrationId,
      kind: input.kind,
      reason,
    });
  }

  await writeLog({
    registrationId,
    kind: input.kind,
    recipientEmail: input.to,
    deliveryStatus,
    failureReason: deliveryStatus === 'failed' ? reason : undefined,
    providerMessageId,
  });

  return { sent: deliveryStatus !== 'failed', reason, providerMessageId };
}

export type RegistrationEmailStatus = {
  lastKind: string | null;
  lastStatus: string | null;
  lastAttemptAt: Date | null;
  failureReason: string | null;
  everSent: boolean;
};

/**
 * Latest email outcome per registration, for the admin registry view.
 * Registrations with no attempt at all come back as `null` — which is itself the
 * answer to "was this person emailed?".
 */
export async function getEmailStatusByRegistration(
  registrationIds: string[],
): Promise<Map<string, RegistrationEmailStatus>> {
  const map = new Map<string, RegistrationEmailStatus>();
  if (registrationIds.length === 0) return map;

  const rows = await prisma.ccwRoadshowEmailLog.findMany({
    where: { registrationId: { in: registrationIds } },
    orderBy: { createdAt: 'desc' },
  });

  for (const row of rows) {
    const existing = map.get(row.registrationId);
    if (!existing) {
      map.set(row.registrationId, {
        lastKind: row.kind,
        lastStatus: row.deliveryStatus,
        lastAttemptAt: row.createdAt,
        failureReason: row.failureReason,
        everSent: row.deliveryStatus === 'sent',
      });
    } else if (row.deliveryStatus === 'sent') {
      existing.everSent = true;
    }
  }

  return map;
}
