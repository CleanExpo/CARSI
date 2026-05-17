import { type NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { getPathwayProgressForStudent } from '@/lib/server/pathway-progress';

/** GET /api/lms/pathways/me/progress — learner progress across published pathways. */
export async function GET(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ pathways: [] });
  }

  try {
    const pathways = await getPathwayProgressForStudent(claims.sub);
    return NextResponse.json({ pathways });
  } catch (e) {
    console.error('[pathways/me/progress]', e);
    return NextResponse.json({ detail: 'Failed to load pathway progress' }, { status: 500 });
  }
}
