import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { configureShortCourseDelivery, ShortCourseProfileError } from '@/lib/server/short-course-profile';

type Ctx = { params: Promise<{ id: string }> };
function reply(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}
async function boundedBody(request: NextRequest): Promise<unknown> {
  if (!request.body) throw new ShortCourseProfileError(400);
  const reader = request.body.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 65536) {
        await reader.cancel();
        throw new ShortCourseProfileError(400);
      }
      chunks.push(value);
    }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
  } catch { throw new ShortCourseProfileError(400); }
  finally { reader.releaseLock(); }
}

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    if (!await getAdminSessionOrNull()) return reply({ detail: 'Unauthorized' }, 401);
    if (!process.env.DATABASE_URL?.trim()) return reply({ detail: 'Delivery profile unavailable' }, 503);
    const input = await boundedBody(request);
    const { id } = await ctx.params;
    const profile = await configureShortCourseDelivery(id, input);
    return reply({ deliveryProfile: profile }, 200);
  } catch (error) {
    return reply({ detail: 'Delivery profile unavailable' }, error instanceof ShortCourseProfileError ? error.status : 503);
  }
}
