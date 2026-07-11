import { NextRequest, NextResponse } from 'next/server';
import { aiWebsiteEnabled } from '@/lib/ai-website/flags';
import { answer } from '@/lib/ai-website/advisor';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!aiWebsiteEnabled()) {
    return new NextResponse('Not found', { status: 404 });
  }
  let message = '';
  try {
    const body = await req.json();
    message = typeof body?.message === 'string' ? body.message.slice(0, 500) : '';
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const reply = answer(message);
  return NextResponse.json(reply);
}
