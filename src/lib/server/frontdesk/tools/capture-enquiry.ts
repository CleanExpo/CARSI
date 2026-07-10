/**
 * Front-desk WRITE tool: capture_enquiry (confirm-gated).
 *
 * `propose` validates the enquiry and returns a signed proposal token — no write.
 * `commit` runs only from the confirm endpoint after the token is verified and a
 * human clicks Confirm; it reuses the existing /api/contact write path
 * (ContactSubmission + emitCrmEvent('lead.captured') + notification email).
 * No new data model, no booking/calendar, no payment.
 */

import { randomUUID } from 'node:crypto';

import { prisma } from '@/lib/prisma';
import { emitCrmEvent } from '@/lib/server/crm-sync';
import { sendContactNotificationEmail } from '@/lib/server/transactional-email';
import { signAction } from '../action-token';
import type { CommitContext, WriteTool, WriteToolProposal } from '../types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface EnquiryData {
  name: string;
  email: string;
  message: string;
}

/** Validate + normalise. Returns the clean payload or a reason string. */
export function validateEnquiry(args: Record<string, unknown>): EnquiryData | { error: string } {
  const name = typeof args.name === 'string' ? args.name.trim() : '';
  const email = typeof args.email === 'string' ? args.email.trim().toLowerCase() : '';
  const message = typeof args.message === 'string' ? args.message.trim() : '';
  if (name.length < 2) return { error: 'A contact name is required.' };
  if (!EMAIL_RE.test(email)) return { error: 'A valid email address is required.' };
  if (message.length < 3) return { error: 'A short message about what they need is required.' };
  return { name: name.slice(0, 120), email: email.slice(0, 200), message: message.slice(0, 2000) };
}

/** Split a single display name into the first/last the ContactSubmission schema needs. */
function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/);
  const firstName = parts.shift() ?? name;
  return { firstName, lastName: parts.join(' ') || '—' };
}

export const captureEnquiryTool: WriteTool = {
  name: 'capture_enquiry',
  description:
    'Prepare a lead/enquiry to send to the CARSI team when a prospect wants a callback, a quote, or to register interest AND has given their name, email, and what they need. This does NOT send anything — it returns a proposal the user must press Confirm on. Never call it without all three details.',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: "The prospect's name." },
      email: { type: 'string', description: "The prospect's email address." },
      message: { type: 'string', description: 'What they need / their enquiry, in their words.' },
    },
    required: ['name', 'email', 'message'],
    additionalProperties: false,
  },
  readOnly: false,
  requiresConfirmation: true,

  async propose(args: Record<string, unknown>): Promise<WriteToolProposal> {
    const v = validateEnquiry(args);
    if ('error' in v) throw new Error(v.error);
    const { token, expiresAt } = signAction({
      tool: 'capture_enquiry',
      data: { name: v.name, email: v.email, message: v.message },
    });
    return {
      tool: 'capture_enquiry',
      summary: `Send your enquiry to the CARSI team as ${v.name} (${v.email}).`,
      token,
      expiresAt,
    };
  },

  async commit(data: Record<string, unknown>, ctx: CommitContext): Promise<{ ok: boolean; reference: string }> {
    const v = validateEnquiry(data);
    if ('error' in v) throw new Error(v.error);
    const submissionId = randomUUID();
    const ticketRef = submissionId.slice(0, 8).toUpperCase();
    const { firstName, lastName } = splitName(v.name);

    if (process.env.DATABASE_URL?.trim()) {
      await prisma.contactSubmission.create({
        data: {
          id: submissionId,
          firstName,
          lastName,
          email: v.email,
          message: v.message,
          status: 'frontdesk_enquiry',
          sourceIp: ctx.sourceIp,
        },
      });
    }

    void emitCrmEvent('lead.captured', {
      submission_id: submissionId,
      email: v.email,
      first_name: firstName,
      last_name: lastName,
      message: v.message,
      ticket_ref: ticketRef,
      lead_source: 'margot_frontdesk',
    });

    const notifyTo =
      process.env.CONTACT_NOTIFY_EMAIL?.trim() ||
      process.env.ADMIN_EMAIL?.trim() ||
      'support@carsi.com.au';
    const emailResult = await sendContactNotificationEmail({
      appOrigin: ctx.appOrigin,
      ticketRef,
      firstName,
      lastName,
      email: v.email,
      message: v.message,
      notifyTo,
    });
    if (!emailResult.sent) {
      console.warn('[capture_enquiry] notification email not sent:', emailResult.reason, '→', notifyTo);
    }

    return { ok: true, reference: ticketRef };
  },
};
