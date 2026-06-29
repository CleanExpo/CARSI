/**
 * Cloudflare Turnstile server-side verification (issue #118).
 *
 * Graceful by design: when `TURNSTILE_SECRET_KEY` is not set the check is skipped
 * (returns ok), so this can ship before the secret is provisioned in the
 * environment without breaking /contact or /submit. Once the key is set, a
 * missing/invalid token is rejected.
 */
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileResult {
  ok: boolean;
  /** True when verification was skipped because no secret is configured. */
  skipped?: boolean;
}

export async function verifyTurnstileToken(
  token: string | undefined | null,
  remoteIp?: string | null
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return { ok: true, skipped: true };

  if (!token || typeof token !== 'string') return { ok: false };

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.set('remoteip', remoteIp);

    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const data = (await res.json()) as { success?: boolean };
    return { ok: data.success === true };
  } catch {
    // Network/verify failure: fail closed (a configured secret means we expect a check).
    return { ok: false };
  }
}
