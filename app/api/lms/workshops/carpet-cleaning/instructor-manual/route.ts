import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { canViewInstructorManual } from '@/lib/server/carsi-workshop-access';
import {
  PRIVATE_DOCUMENT_HEADERS,
  renderInstructorManual,
} from '@/lib/server/carsi-workshop-manuals';

export const dynamic = 'force-dynamic';

/** Source file; listed in next.config `outputFileTracingIncludes` so it ships with this route. */
const INSTRUCTOR_GUIDE_PATH = path.join(
  process.cwd(),
  'docs',
  'course-content',
  'ccw-workshop',
  'instructor-guide.md'
);

/** Instructor manual: authorised CARSI instructors and admins only. Participants get 403. */
export async function GET(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  if (!canViewInstructorManual(claims)) {
    return NextResponse.json({ detail: 'Instructors only' }, { status: 403 });
  }

  let markdown: string;
  try {
    markdown = await readFile(INSTRUCTOR_GUIDE_PATH, 'utf8');
  } catch (e) {
    console.error('[workshop/instructor-manual] source missing', e);
    return NextResponse.json({ detail: 'Instructor manual unavailable' }, { status: 503 });
  }

  return new NextResponse(renderInstructorManual(markdown), {
    status: 200,
    headers: PRIVATE_DOCUMENT_HEADERS,
  });
}
