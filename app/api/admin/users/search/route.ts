import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  // RA-3027 — bumped from 2 to 3 chars. 2-char substrings return huge
  // PII slices that resemble enumeration / scraping access patterns.
  if (q.length < 3) {
    return NextResponse.json({ users: [] });
  }
  // RA-3027 — best-effort audit log of admin search queries. Structured
  // JSON for downstream log aggregation. Failure here is non-fatal.
  try {
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        kind: 'admin_search',
        admin_email: session.email,
        q_length: q.length,
      }),
    );
  } catch {
    // swallow — never block a search on audit-log failure
  }

  const term = q.toLowerCase();
  try {
    const users = await prisma.lmsUser.findMany({
      where: {
        isActive: true,
        OR: [
          { email: { contains: term, mode: 'insensitive' } },
          { fullName: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, email: true, fullName: true },
      take: 25,
      orderBy: { email: 'asc' },
    });
    return NextResponse.json({ users });
  } catch (e) {
    console.error('[admin/users/search]', e);
    return NextResponse.json({ detail: 'Search failed' }, { status: 500 });
  }
}
