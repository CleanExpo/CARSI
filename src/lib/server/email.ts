/**
 * Transactional email via Resend (https://resend.com).
 * Requires RESEND_API_KEY and a verified EMAIL_FROM domain in production.
 */

export type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function resolveFromAddress(): string {
  const configured = process.env.EMAIL_FROM?.trim();
  if (configured) return configured;

  // Resend onboarding domain — only for dev/testing; verify your domain for production.
  if (process.env.NODE_ENV !== 'production') {
    return 'CARSI Learning <onboarding@resend.dev>';
  }

  return 'CARSI Learning <noreply@carsi.com.au>';
}

export async function sendEmail(params: SendEmailParams): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = resolveFromAddress();

  if (!apiKey) {
    console.warn(
      '[email] RESEND_API_KEY not set — skipped:',
      params.subject,
      '→',
      params.to,
      '(set RESEND_API_KEY and EMAIL_FROM in .env)'
    );
    return { sent: false, reason: 'not_configured' };
  }

  const to = Array.isArray(params.to) ? params.to : [params.to];

  const payload: Record<string, unknown> = {
    from,
    to,
    subject: params.subject,
    html: params.html,
  };
  if (params.text) payload.text = params.text;
  if (params.replyTo) payload.reply_to = params.replyTo;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });

    const bodyText = await res.text().catch(() => '');
    if (!res.ok) {
      console.error('[email] Resend error', res.status, bodyText);
      return { sent: false, reason: `resend_${res.status}` };
    }

    try {
      const parsed = JSON.parse(bodyText) as { id?: string };
      if (parsed.id) {
        console.info('[email] sent', params.subject, '→', to.join(', '), 'id=', parsed.id);
      }
    } catch {
      console.info('[email] sent', params.subject, '→', to.join(', '));
    }

    return { sent: true };
  } catch (err) {
    console.error('[email] send failed:', err);
    return { sent: false, reason: 'send_failed' };
  }
}
