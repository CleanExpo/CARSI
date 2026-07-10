/**
 * Signed action tokens — the heart of the write confirm-gate.
 *
 * A write tool's `propose` returns a token = base64url(payload).base64url(HMAC).
 * The confirm endpoint verifies the HMAC (timing-safe) and the TTL before any
 * mutation runs. The model can produce arguments but never a valid token — only
 * this module (holding the server secret) can — so a write cannot happen without
 * a human clicking Confirm on a token this server minted.
 *
 * Fail-closed: with no configured secret, verification always fails and
 * `actionSecretConfigured()` is false (callers disable write tools entirely).
 */

import crypto from 'node:crypto';

const TTL_MS = 10 * 60 * 1000; // 10 minutes — long enough to read + click, short enough to bound replay.

function secret(): string {
  return process.env.MARGOT_ACTION_SECRET?.trim() ?? '';
}

/** True only when a usable HMAC secret is present (≥16 chars). Gates write tools. */
export function actionSecretConfigured(): boolean {
  return secret().length >= 16;
}

export interface ActionPayload {
  tool: string;
  data: Record<string, unknown>;
}

export function signAction(
  payload: ActionPayload,
  now: number = Date.now()
): { token: string; expiresAt: number } {
  const expiresAt = now + TTL_MS;
  const body = Buffer.from(JSON.stringify({ ...payload, expiresAt })).toString('base64url');
  const mac = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return { token: `${body}.${mac}`, expiresAt };
}

export type VerifyResult =
  | { ok: true; payload: ActionPayload }
  | { ok: false; reason: 'secret_unconfigured' | 'malformed' | 'bad_signature' | 'bad_payload' | 'expired' };

export function verifyAction(token: string, now: number = Date.now()): VerifyResult {
  if (!actionSecretConfigured()) return { ok: false, reason: 'secret_unconfigured' };
  const parts = typeof token === 'string' ? token.split('.') : [];
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: 'malformed' };
  const [body, mac] = parts;

  const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: 'bad_signature' };
  }

  let parsed: { tool?: unknown; data?: unknown; expiresAt?: unknown };
  try {
    parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, reason: 'bad_payload' };
  }
  if (typeof parsed.tool !== 'string' || typeof parsed.data !== 'object' || parsed.data === null) {
    return { ok: false, reason: 'bad_payload' };
  }
  if (typeof parsed.expiresAt !== 'number' || parsed.expiresAt < now) {
    return { ok: false, reason: 'expired' };
  }
  return { ok: true, payload: { tool: parsed.tool, data: parsed.data as Record<string, unknown> } };
}
