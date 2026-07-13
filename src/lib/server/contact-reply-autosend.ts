/**
 * WS5 — AI contact-reply auto-send trust boundary.
 *
 * The self-approval hole: the SLA cron auto-emailed drafts whose `autoSendEligible`
 * was set from a caller-supplied `judgeVerdict` produced by the same credential
 * that drafts the reply — the model approved its own outbound email. The fix
 * (route side): `autoSendEligible` is forced false on create, so a caller can never
 * make a draft auto-send-eligible. This helper adds the operator opt-in: auto-send
 * stays OFF unless CONTACT_REPLY_AUTOSEND_ENABLED is explicitly set, so even a stray
 * eligible row is not sent by default and enabling it is a deliberate decision.
 */
export function autoSendEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.CONTACT_REPLY_AUTOSEND_ENABLED?.trim().toLowerCase() === 'true';
}
