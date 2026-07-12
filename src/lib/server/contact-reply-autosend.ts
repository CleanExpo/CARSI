import type { JudgeVerdict } from '@/lib/server/contact-reply';

/**
 * WS5 — AI contact-reply auto-send trust boundary.
 *
 * The self-approval hole: the SLA cron auto-emailed drafts whose `autoSendEligible`
 * was set from a caller-supplied `judgeVerdict` produced by the same credential
 * that drafts the reply — the model approved its own outbound email. The fix
 * (route side): `autoSendEligible` is forced false on create, so a caller can never
 * make a draft auto-send-eligible. These pure helpers add two defences:
 *  - `autoSendEnabled`: auto-send stays OFF unless an operator explicitly opts in,
 *    so even a stray eligible row is not sent by default.
 *  - `judgeVerdictApproved`: an exact, fail-closed reading of a verdict (advisory
 *    only), replacing the `/approve/i` substring test that passed 'not approved'.
 */
export function autoSendEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.CONTACT_REPLY_AUTOSEND_ENABLED?.trim().toLowerCase() === 'true';
}

export function judgeVerdictApproved(verdict?: JudgeVerdict | null): boolean {
  if (!verdict) return false;
  const decision = typeof verdict.verdict === 'string' ? verdict.verdict.trim().toLowerCase() : '';
  return decision === 'approve' || decision === 'approved';
}
