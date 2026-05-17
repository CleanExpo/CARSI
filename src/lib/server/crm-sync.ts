import { randomUUID } from 'node:crypto';
import type { Prisma } from '@/generated/prisma/client';

import { prisma } from '@/lib/prisma';

export type CrmEventType =
  | 'contact.created'
  | 'enrollment.created'
  | 'enrollment.completed';

export interface CrmContactPayload {
  submission_id: string;
  email: string;
  first_name: string;
  last_name: string;
  message: string;
  ticket_ref: string;
}

export interface CrmEnrollmentPayload {
  enrollment_id: string;
  student_id: string;
  student_email: string;
  course_id: string;
  course_title: string;
  course_slug: string;
  status: string;
}

/**
 * POST JSON to CRM_WEBHOOK_URL (HubSpot/Pipedrive/generic). Logs every attempt.
 * Never throws — callers should not block user flows on CRM failures.
 */
export async function emitCrmEvent(
  eventType: CrmEventType,
  payload: Record<string, unknown>
): Promise<void> {
  const webhookUrl = process.env.CRM_WEBHOOK_URL?.trim();
  const id = randomUUID();

  if (!process.env.DATABASE_URL?.trim()) {
    if (!webhookUrl) return;
  }

  let logId: string | null = null;
  try {
    if (process.env.DATABASE_URL?.trim()) {
      await prisma.crmEventLog.create({
        data: {
          id,
          eventType,
          payload: payload as Prisma.InputJsonValue,
          status: webhookUrl ? 'pending' : 'skipped',
        },
      });
      logId = id;
    }
  } catch (e) {
    console.error('[crm-sync] log create', e);
  }

  if (!webhookUrl) return;

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.CRM_WEBHOOK_SECRET
          ? { 'X-CARSI-Webhook-Secret': process.env.CRM_WEBHOOK_SECRET }
          : {}),
      },
      body: JSON.stringify({
        event: eventType,
        occurred_at: new Date().toISOString(),
        data: payload,
      }),
      signal: AbortSignal.timeout(12_000),
    });

    const bodyText = await res.text().catch(() => '');
    const status = res.ok ? 'delivered' : 'failed';

    if (logId && process.env.DATABASE_URL?.trim()) {
      await prisma.crmEventLog.update({
        where: { id: logId },
        data: {
          status,
          responseStatus: res.status,
          responseBody: bodyText.slice(0, 4000),
        },
      });
    }
  } catch (e) {
    console.error('[crm-sync] webhook', eventType, e);
    if (logId && process.env.DATABASE_URL?.trim()) {
      await prisma.crmEventLog
        .update({
          where: { id: logId },
          data: {
            status: 'failed',
            responseBody: e instanceof Error ? e.message : 'Webhook error',
          },
        })
        .catch(() => null);
    }
  }
}
