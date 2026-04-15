import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';

import { v2 as cloudinary } from 'cloudinary';

const DEFAULT_FOLDER = 'carsi/admin-courses';

/** Cloudinary Node SDK defaults to 60s; large/slow uploads hit 499 TimeoutError. */
const UPLOAD_TIMEOUT_MS = 180_000;
const UPLOAD_MAX_ATTEMPTS = 3;

function getConfig(): { cloud_name: string; api_key: string; api_secret: string } | null {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const api_key = process.env.CLOUDINARY_API_KEY?.trim();
  const api_secret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloud_name || !api_key || !api_secret) return null;
  return { cloud_name, api_key, api_secret };
}

export function isCloudinaryConfigured(): boolean {
  return getConfig() !== null;
}

function isLikelyUploadTimeout(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const o = err as Record<string, unknown>;
  const nested =
    o.error && typeof o.error === 'object' ? (o.error as Record<string, unknown>) : null;
  const msg = String(o.message ?? nested?.message ?? '');
  const name = String(o.name ?? nested?.name ?? '');
  const code = nested?.http_code ?? o.http_code;
  return (
    name === 'TimeoutError' ||
    msg.includes('Timeout') ||
    msg.includes('timeout') ||
    code === 499
  );
}

function uploadCourseThumbnailStreamOnce(
  buffer: Buffer,
  cfg: NonNullable<ReturnType<typeof getConfig>>
): Promise<{ url: string; publicId: string }> {
  cloudinary.config({
    cloud_name: cfg.cloud_name,
    api_key: cfg.api_key,
    api_secret: cfg.api_secret,
    secure: true,
  });

  const publicId = randomUUID();

  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: DEFAULT_FOLDER,
        public_id: publicId,
        resource_type: 'image',
        overwrite: false,
        invalidate: true,
        timeout: UPLOAD_TIMEOUT_MS,
      },
      (err, result) => {
        if (err || !result?.secure_url) {
          reject(err ?? new Error('Cloudinary upload failed'));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id ?? `${DEFAULT_FOLDER}/${publicId}`,
        });
      }
    );

    Readable.from(buffer).pipe(upload);
  });
}

/**
 * Upload an image buffer to Cloudinary. Returns HTTPS URL suitable for storing in `thumbnail_url`.
 * Retries a few times on network / Cloudinary timeout (499).
 */
export async function uploadCourseThumbnailToCloudinary(
  buffer: Buffer,
  _mime: string
): Promise<{ url: string; publicId: string }> {
  const cfg = getConfig();
  if (!cfg) {
    throw new Error('Cloudinary is not configured (set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)');
  }

  let lastErr: unknown;
  for (let attempt = 1; attempt <= UPLOAD_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await uploadCourseThumbnailStreamOnce(buffer, cfg);
    } catch (e) {
      lastErr = e;
      if (attempt < UPLOAD_MAX_ATTEMPTS && isLikelyUploadTimeout(e)) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
        continue;
      }
      throw e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
