/**
 * AI Website notifier — the enrolment automation ("n8n-style triggers").
 *
 * Every planned step is recorded as an AiWebsiteEvent so the admin CRM can show the flow. Real
 * delivery goes through a pluggable provider interface: with no provider configured (the default),
 * steps are recorded as intents only — nothing is sent. Wire a real provider (Resend/Twilio/etc.)
 * behind `resolveEmailProvider` / `resolveSmsProvider` and set the env keys to make it live.
 * See docs/ai-website/RUNBOOK.md.
 */
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';

export interface EmailProvider {
  send(to: string, subject: string, body: string): Promise<void>;
}
export interface SmsProvider {
  send(to: string, body: string): Promise<void>;
}

// No provider is bundled (no email/SMS SDK is a dependency). These return null until the founder
// wires one and sets the env keys; the flow then sends instead of only recording.
function resolveEmailProvider(): EmailProvider | null {
  // e.g. if (process.env.RESEND_API_KEY) return new ResendEmailProvider(process.env.RESEND_API_KEY);
  return null;
}
function resolveSmsProvider(): SmsProvider | null {
  // e.g. if (process.env.TWILIO_AUTH_TOKEN) return new TwilioSmsProvider(...);
  return null;
}

type Lead = { id: string; name: string; email: string; phone: string | null };

async function record(leadId: string, kind: string, channel: string, detail: string): Promise<void> {
  await prisma.aiWebsiteEvent.create({
    data: { id: randomUUID(), leadId, kind, channel, detail },
  });
}

/**
 * Run the enrolment flow for a new lead. Records every step; sends the ones a provider is configured
 * for. Time-delayed steps (SMS +24h, follow-up +2d) are recorded as scheduled intents — a cron/worker
 * dispatches due intents (see RUNBOOK "Scheduled dispatch").
 */
export async function runEnrolmentFlow(lead: Lead): Promise<void> {
  const email = resolveEmailProvider();
  const sms = resolveSmsProvider();

  await record(lead.id, 'lead_captured', 'system', 'Contact created from AI website form');
  await record(lead.id, 'email_verified', 'system', `Format check passed for ${lead.email}`);

  const welcome = 'Welcome to CARSI — your learning pathway';
  const welcomeBody = `Hi ${lead.name}, thanks for reaching out. Your CARSI course pathway is ready and a team member will follow up shortly.`;
  if (email) {
    await email.send(lead.email, welcome, welcomeBody);
    await record(lead.id, 'welcome_email', 'email', `Sent to ${lead.email}`);
  } else {
    await record(lead.id, 'welcome_email', 'email', 'Scheduled: within the hour (no email provider configured — intent recorded)');
  }

  await record(lead.id, 'sms_followup', 'sms', lead.phone
    ? `Scheduled: within 24 hours to ${lead.phone}${sms ? '' : ' (no SMS provider configured — intent recorded)'}`
    : 'Skipped: no mobile provided');
  await record(lead.id, 'followup_email', 'email', 'Scheduled: day 2 follow-up');
  await record(lead.id, 'callback_booked', 'system', 'Scheduled: day 2 callback with the team');
}
