import { NextResponse } from 'next/server';

/**
 * One rule for every write route (release-gate review r3): without a database nothing can be
 * stored, so a write must never answer with success. Read-only routes may still return empty
 * data; write routes return this 503 with no `ok` or result fields.
 */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function databaseUnavailableResponse(
  detail = 'This action is temporarily unavailable. Please try again.',
  extra: Record<string, unknown> = {}
): NextResponse {
  return NextResponse.json({ detail, ...extra }, { status: 503 });
}
