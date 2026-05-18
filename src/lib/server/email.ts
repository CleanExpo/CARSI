/**
 * Low-level email delivery via Resend (https://resend.com).
 * Prefer @/lib/server/transactional-email for branded CARSI templates.
 * Local dev: set EMAIL_DEV_CONSOLE=true or emails log to the terminal when Resend is unreachable.
 */

export type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export type SendEmailResult = {
  sent: boolean;
  reason?: 'not_configured' | 'send_failed' | 'resend_error' | 'dev_console';
};

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function devConsoleEnabled(): boolean {
  return process.env.EMAIL_DEV_CONSOLE === 'true' || process.env.NODE_ENV === 'development';
}

function isEmailNetworkError(err: unknown): boolean {
  const check = (e: unknown): boolean => {
    if (!e || typeof e !== 'object') return false;
    const code = (e as NodeJS.ErrnoException).code;
    if (
      code === 'ENOTFOUND' ||
      code === 'ECONNREFUSED' ||
      code === 'ENETUNREACH' ||
      code === 'ETIMEDOUT' ||
      code === 'EAI_AGAIN'
    ) {
      return true;
    }
    if ('cause' in e && (e as Error).cause) return check((e as Error).cause);
    return false;
  };
  return check(err);
}

function logDevConsoleEmail(params: SendEmailParams): void {
  const to = Array.isArray(params.to) ? params.to.join(', ') : params.to;
  console.warn('\n========== [email dev] ==========');
  console.warn(`To: ${to}`);
  console.warn(`Subject: ${params.subject}`);
  if (params.text) {
    console.warn('---');
    console.warn(params.text);
  }
  console.warn(
    'Resend not used (no API key, EMAIL_DEV_CONSOLE=true, or network blocked). For real delivery: RESEND_API_KEY + internet to api.resend.com'
  );
  console.warn('==================================\n');
}

function resolveFromAddress(): string {
  const configured = process.env.EMAIL_FROM?.trim();
  if (configured) return configured;

  if (process.env.NODE_ENV !== 'production') {
    return 'CARSI Learning <onboarding@resend.dev>';
  }

  return 'CARSI Learning <noreply@carsi.com.au>';
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = resolveFromAddress();
  const to = Array.isArray(params.to) ? params.to : [params.to];

  if (!apiKey) {
    if (devConsoleEnabled()) {
      logDevConsoleEmail(params);
      return { sent: true, reason: 'dev_console' };
    }
    console.warn(
      '[email] RESEND_API_KEY not set — skipped:',
      params.subject,
      '→',
      to.join(', ')
    );
    return { sent: false, reason: 'not_configured' };
  }

  if (process.env.EMAIL_DEV_CONSOLE === 'true') {
    logDevConsoleEmail(params);
    return { sent: true, reason: 'dev_console' };
  }

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
      console.error('[email] Resend API error', res.status, bodyText);
      if (devConsoleEnabled()) {
        logDevConsoleEmail(params);
        return { sent: true, reason: 'dev_console' };
      }
      return { sent: false, reason: 'resend_error' };
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
    if (devConsoleEnabled() && isEmailNetworkError(err)) {
      console.warn(
        '[email] Resend unreachable (check internet / DNS for api.resend.com) — using dev console output'
      );
      logDevConsoleEmail(params);
      return { sent: true, reason: 'dev_console' };
    }

    console.error('[email] send failed:', err);
    if (devConsoleEnabled()) {
      logDevConsoleEmail(params);
      return { sent: true, reason: 'dev_console' };
    }
    return { sent: false, reason: 'send_failed' };
  }
}
