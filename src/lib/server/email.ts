/**
 * Transactional email via Resend (https://resend.com).
 * When RESEND_API_KEY is unset, logs only — callers still persist to DB.
 */

export type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export async function sendEmail(params: SendEmailParams): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || 'CARSI Learning <noreply@carsi.com.au>';

  if (!apiKey) {
    console.info('[email] RESEND_API_KEY not set — skipped send:', params.subject, '→', params.to);
    return { sent: false, reason: 'not_configured' };
  }

  const to = Array.isArray(params.to) ? params.to : [params.to];

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject: params.subject,
        html: params.html,
        text: params.text,
        reply_to: params.replyTo,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[email] Resend error', res.status, body);
      return { sent: false, reason: `resend_${res.status}` };
    }

    return { sent: true };
  } catch (err) {
    console.error('[email] send failed:', err);
    return { sent: false, reason: 'send_failed' };
  }
}
