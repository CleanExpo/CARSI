import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { prisma } from '@/lib/prisma';

/** GET /api/admin/contacts — list contact submissions (newest first). */
export async function GET(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ items: [] });
  }

  const status = request.nextUrl.searchParams.get('status')?.trim();
  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') ?? 50), 100);

  const items = await prisma.contactSubmission.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return NextResponse.json({
    items: items.map((r) => ({
      id: r.id,
      first_name: r.firstName,
      last_name: r.lastName,
      email: r.email,
      message: r.message,
      status: r.status,
      source_ip: r.sourceIp,
      created_at: r.createdAt.toISOString(),
    })),
  });
}

/** PATCH /api/admin/contacts — update status. Body: { id, status } */
export async function PATCH(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { id?: string; status?: string };
  const id = body.id?.trim();
  const status = body.status?.trim();
  if (!id || !status) {
    return NextResponse.json({ detail: 'id and status required' }, { status: 400 });
  }

  const allowed = new Set(['new', 'read', 'replied', 'archived']);
  if (!allowed.has(status)) {
    return NextResponse.json({ detail: 'Invalid status' }, { status: 400 });
  }

  await prisma.contactSubmission.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json({ ok: true });
}
