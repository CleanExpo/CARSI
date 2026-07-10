/**
 * Confirm-gated write execution for the AI Front Desk (Phase 2).
 *
 * The ONLY path that runs a write tool's `commit`. It requires: the write-tools
 * feature on (flag + secret), a rate-limit pass, and a valid, unexpired,
 * untampered action token (minted by the tool's `propose` and surfaced to the
 * user for an explicit Confirm click). No token ⇒ no write.
 */

import { NextResponse, type NextRequest } from 'next/server';

import { getAppOrigin } from '@/lib/server/app-url';
import { verifyAction } from '@/lib/server/frontdesk/action-token';
import { getWriteTool } from '@/lib/server/frontdesk/registry';
import { margotWriteToolsEnabled } from '@/lib/server/margot-write-tools-flag';
import { applyRateLimit, clientIpFrom, UNKNOWN_IP } from '@/lib/rate-limit';

export const maxDuration = 30;

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

export async function POST(request: NextRequest) {
  // Feature off (flag or secret) ⇒ endpoint does not exist.
  if (!margotWriteToolsEnabled()) {
    return NextResponse.json({ detail: 'Not found.' }, { status: 404 });
  }

  const ip = clientIpFrom(request.headers.get('x-forwarded-for'), request.headers.get('x-real-ip'));
  const rl = applyRateLimit(`frontdesk-action:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { detail: 'Too many requests. Please wait a moment and try again.' },
      { status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))) } }
    );
  }

  let body: { token?: unknown };
  try {
    body = (await request.json()) as { token?: unknown };
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON body.' }, { status: 400 });
  }

  const token = typeof body.token === 'string' ? body.token : '';
  const verified = verifyAction(token);
  if (!verified.ok) {
    const status = verified.reason === 'expired' ? 410 : 400;
    return NextResponse.json(
      { detail: 'This confirmation is no longer valid. Please ask again and confirm the fresh prompt.' },
      { status }
    );
  }

  const tool = getWriteTool(verified.payload.tool);
  if (!tool) {
    return NextResponse.json({ detail: 'Unknown action.' }, { status: 400 });
  }

  try {
    const result = await tool.commit(verified.payload.data, {
      appOrigin: getAppOrigin(request),
      sourceIp: ip === UNKNOWN_IP ? null : ip,
    });
    return NextResponse.json({ ok: true, ...(result && typeof result === 'object' ? result : {}) });
  } catch (e) {
    console.error('[frontdesk/action] commit failed:', e);
    return NextResponse.json({ detail: 'Could not complete the action. Please try again.' }, { status: 500 });
  }
}
