import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { aiWebsiteEnabled } from '@/lib/ai-website/flags';
import { runEnrolmentFlow } from '@/lib/ai-website/notifier';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  if (!aiWebsiteEnabled()) {
    return new NextResponse('Not found', { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const name = String(body.name ?? '').trim().slice(0, 120);
  const email = String(body.email ?? '').trim().slice(0, 160);
  const phone = String(body.phone ?? '').trim().slice(0, 40) || null;
  const role = String(body.role ?? '').trim().slice(0, 120) || null;
  const pathway = String(body.pathway ?? '').trim().slice(0, 60) || null;

  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });

  const lead = await prisma.aiWebsiteLead.create({
    data: {
      id: randomUUID(),
      name,
      email,
      phone,
      role,
      advisorPathway: pathway,
      source: 'ai-website',
      emailVerified: true, // format-verified here; deliverability check is a provider step
      status: 'new',
    },
  });

  await runEnrolmentFlow({ id: lead.id, name: lead.name, email: lead.email, phone: lead.phone });

  const events = await prisma.aiWebsiteEvent.findMany({
    where: { leadId: lead.id },
    orderBy: { createdAt: 'asc' },
    select: { kind: true, channel: true, detail: true },
  });

  return NextResponse.json({ id: lead.id, status: lead.status, events });
}
