import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';

import { NextRequest, NextResponse } from 'next/server';

import { CCW_COOKIE_NAME, verifyCcwAccessToken } from '@/lib/ccw/access-token';
import { ccwMaterialsDir, findMaterial } from '@/lib/ccw/file-registry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Stream a whitelisted CCW take-home file back to an authenticated caller.
 *
 * Access rules:
 *   1. Must present a valid CCW access cookie (signed JWT with matching purpose).
 *   2. `file` query param must match a key in the file registry (no arbitrary paths).
 *   3. Resolved file path is asserted to live inside /content/ccw-take-home/.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get(CCW_COOKIE_NAME)?.value;
  const authed = await verifyCcwAccessToken(token);
  if (!authed) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 401 });
  }

  const key = request.nextUrl.searchParams.get('file');
  const material = findMaterial(key);
  if (!material) {
    return NextResponse.json({ error: 'Unknown file' }, { status: 404 });
  }

  const dir = ccwMaterialsDir();
  const absPath = path.resolve(dir, material.filename);
  // Defence-in-depth: registry filenames are hardcoded, but verify regardless.
  if (!absPath.startsWith(dir + path.sep) && absPath !== dir) {
    return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
  }

  let fileStat;
  try {
    fileStat = await stat(absPath);
  } catch {
    return NextResponse.json({ error: 'File not available on this deploy' }, { status: 404 });
  }
  if (!fileStat.isFile()) {
    return NextResponse.json({ error: 'File not available on this deploy' }, { status: 404 });
  }

  const nodeStream = createReadStream(absPath);
  // Next.js / undici expects a web ReadableStream, not a Node stream.
  const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      'Content-Type': material.contentType,
      'Content-Length': String(fileStat.size),
      'Content-Disposition': `attachment; filename="${material.filename}"`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
