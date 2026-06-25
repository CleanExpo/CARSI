import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { isCloudinaryConfigured, uploadCourseThumbnailToCloudinary } from '@/lib/server/cloudinary-upload';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function extForMime(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  return 'bin';
}

/**
 * Detect the real image type from the file's leading "magic" bytes, so a
 * renamed/spoofed `file.type` cannot smuggle a non-image past the allowlist.
 * Returns the detected MIME, or null if the content is not a supported image.
 */
function sniffImageMime(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (buf.length >= 6 && buf.subarray(0, 6).toString('latin1').match(/^GIF8[79]a$/)) {
    return 'image/gif';
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString('latin1') === 'RIFF' &&
    buf.subarray(8, 12).toString('latin1') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

export async function POST(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ detail: 'Invalid form data' }, { status: 400 });
  }

  const file = form.get('file');
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ detail: 'file field required' }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ detail: 'File too large (max 5MB)' }, { status: 400 });
  }

  const declaredMime = file.type || 'application/octet-stream';
  if (!ALLOWED.has(declaredMime)) {
    return NextResponse.json({ detail: 'Only JPEG, PNG, WebP, or GIF images allowed' }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());

  // Don't trust the client-declared MIME: verify the real format from the
  // file's magic bytes before persisting or forwarding it anywhere.
  const mime = sniffImageMime(buf);
  if (!mime || !ALLOWED.has(mime)) {
    return NextResponse.json(
      { detail: 'File content is not a valid JPEG, PNG, WebP, or GIF image' },
      { status: 400 }
    );
  }

  if (isCloudinaryConfigured()) {
    try {
      const { url } = await uploadCourseThumbnailToCloudinary(buf, mime);
      return NextResponse.json({ url, storage: 'cloudinary' as const });
    } catch (e) {
      console.error('[admin/upload] Cloudinary failed:', e);
      return NextResponse.json({ detail: 'Cloudinary upload failed' }, { status: 502 });
    }
  }

  const dir = path.join(process.cwd(), 'public', 'uploads', 'admin-courses');
  await mkdir(dir, { recursive: true });
  const name = `${randomUUID()}.${extForMime(mime)}`;
  const fsPath = path.join(dir, name);
  await writeFile(fsPath, buf);

  const publicPath = `/uploads/admin-courses/${name}`;
  return NextResponse.json({ url: publicPath, storage: 'local' as const });
}
