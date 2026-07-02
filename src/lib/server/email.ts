/**
 * Low-level email delivery via Mailtrap Email Sending API (https://mailtrap.io).
 * Prefer @/lib/server/transactional-email for branded CARSI templates.
 * Local dev: set EMAIL_DEV_CONSOLE=true or emails log to the terminal when Mailtrap is unreachable.
 */

export type EmailAttachment = {
  filename: string;
  /** Raw bytes or base64 string for the Mailtrap API. */
  content: Buffer | Uint8Array | string;
};

export type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: EmailAttachment[];
  /** Extra SMTP headers (e.g. List-Unsubscribe / List-Unsubscribe-Post for RFC 8058). */
  headers?: Record<string, string>;
};

export type SendEmailResult = {
  sent: boolean;
  messageId?: string;
  reason?: 'not_configured' | 'send_failed' | 'provider_error' | 'dev_console';
};

const MAILTRAP_SEND_URL = 'https://send.api.mailtrap.io/api/send';

export function isEmailConfigured(): boolean {
  return Boolean(process.env.MAILTRAP_API_KEY?.trim());
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
    'Mailtrap not used (no API key, EMAIL_DEV_CONSOLE=true, or network blocked). For real delivery: MAILTRAP_API_KEY + internet to send.api.mailtrap.io'
  );
  console.warn('==================================\n');
}

function parseEmailAddress(raw: string): { email: string; name?: string } {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    const name = match[1].trim().replace(/^["']|["']$/g, '');
    return { name: name || undefined, email: match[2].trim() };
  }
  return { email: trimmed };
}

function toAddressList(addrs: string | string[]): { email: string; name?: string }[] {
  const list = Array.isArray(addrs) ? addrs : [addrs];
  return list.map((addr) => parseEmailAddress(addr));
}

function resolveFromAddress(): { email: string; name?: string } {
  const configured = process.env.EMAIL_FROM?.trim();
  if (configured) return parseEmailAddress(configured);

  if (process.env.NODE_ENV !== 'production') {
    return { name: 'CARSI Learning', email: 'support@carsi.com.au' };
  }

  return { name: 'CARSI Learning', email: 'noreply@carsi.com.au' };
}

function guessMimeType(filename: string): string | undefined {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'text/html';
  if (lower.endsWith('.txt')) return 'text/plain';
  return undefined;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.MAILTRAP_API_KEY?.trim();
  const from = resolveFromAddress();
  const to = Array.isArray(params.to) ? params.to : [params.to];

  if (!apiKey) {
    if (devConsoleEnabled()) {
      logDevConsoleEmail(params);
      return { sent: true, reason: 'dev_console' };
    }
    console.warn(
      '[email] MAILTRAP_API_KEY not set — skipped:',
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
    to: toAddressList(to),
    subject: params.subject,
    html: params.html,
  };
  if (params.text) payload.text = params.text;
  if (params.headers && Object.keys(params.headers).length > 0) payload.headers = params.headers;
  if (params.replyTo) payload.reply_to = parseEmailAddress(params.replyTo);
  if (params.cc) payload.cc = toAddressList(params.cc);
  if (params.bcc) payload.bcc = toAddressList(params.bcc);
  if (params.attachments?.length) {
    payload.attachments = params.attachments.map((a) => {
      const content =
        typeof a.content === 'string'
          ? a.content
          : Buffer.from(a.content).toString('base64');
      const mimeType = guessMimeType(a.filename);
      return {
        filename: a.filename,
        content,
        ...(mimeType ? { type: mimeType } : {}),
        disposition: 'attachment',
      };
    });
  }

  try {
    const res = await fetch(MAILTRAP_SEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });

    const bodyText = await res.text().catch(() => '');
    let parsed: { success?: boolean; message_ids?: string[]; errors?: string[] } = {};
    try {
      parsed = JSON.parse(bodyText) as typeof parsed;
    } catch {
      // non-JSON body
    }

    if (!res.ok || parsed.success === false) {
      const errDetail =
        parsed.errors?.join('; ') || bodyText || `HTTP ${res.status}`;
      console.error('[email] Mailtrap API error', res.status, errDetail);
      if (devConsoleEnabled()) {
        logDevConsoleEmail(params);
        return { sent: true, reason: 'dev_console' };
      }
      return { sent: false, reason: 'provider_error' };
    }

    const messageId = parsed.message_ids?.[0];
    if (messageId) {
      console.info('[email] sent', params.subject, '→', to.join(', '), 'id=', messageId);
      return { sent: true, messageId };
    }

    console.info('[email] sent', params.subject, '→', to.join(', '));
    return { sent: true };
  } catch (err) {
    if (devConsoleEnabled() && isEmailNetworkError(err)) {
      console.warn(
        '[email] Mailtrap unreachable (check internet / DNS for send.api.mailtrap.io) — using dev console output'
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
