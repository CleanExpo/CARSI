import { type NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { listNotesForUser } from '@/lib/server/lesson-notes';

/** GET /api/lms/notes/me — current user's lesson notes, newest-updated first (GP-459). */
export async function GET(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json([]);
  }

  try {
    const notes = await listNotesForUser(claims.sub);
    return NextResponse.json(notes);
  } catch (e) {
    console.error('[notes/me]', e);
    return NextResponse.json({ detail: 'Failed to load notes' }, { status: 500 });
  }
}
