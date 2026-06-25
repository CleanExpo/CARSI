import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';

import { v2 as cloudinary } from 'cloudinary';

const DEFAULT_FOLDER = 'carsi/admin-courses';
const DEFAULT_VIDEO_FOLDER = 'carsi/demo-videos';
const DEFAULT_AUDIO_FOLDER = 'carsi/course-audio';
const CERTIFICATE_FOLDER = 'carsi/certificates';

/** Cloudinary Node SDK defaults to 60s; large/slow uploads hit 499 TimeoutError. */
const UPLOAD_TIMEOUT_MS = 180_000;
/** Video files are larger than thumbnails; give the upload stream a longer ceiling. */
const VIDEO_UPLOAD_TIMEOUT_MS = 600_000;
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

function uploadBufferStreamOnce(
  buffer: Buffer,
  cfg: NonNullable<ReturnType<typeof getConfig>>,
  options: {
    folder: string;
    publicId: string;
    resourceType: 'image' | 'raw';
    format?: string;
    overwrite?: boolean;
  }
): Promise<{ url: string; publicId: string }> {
  cloudinary.config({
    cloud_name: cfg.cloud_name,
    api_key: cfg.api_key,
    api_secret: cfg.api_secret,
    secure: true,
  });

  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        public_id: options.publicId,
        resource_type: options.resourceType,
        format: options.format,
        overwrite: options.overwrite ?? false,
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
          publicId: result.public_id ?? `${options.folder}/${options.publicId}`,
        });
      }
    );

    Readable.from(buffer).pipe(upload);
  });
}

async function uploadWithRetries(
  buffer: Buffer,
  options: {
    folder: string;
    publicId: string;
    resourceType: 'image' | 'raw';
    format?: string;
    overwrite?: boolean;
  }
): Promise<{ url: string; publicId: string }> {
  const cfg = getConfig();
  if (!cfg) {
    throw new Error(
      'Cloudinary is not configured (set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)'
    );
  }

  let lastErr: unknown;
  for (let attempt = 1; attempt <= UPLOAD_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await uploadBufferStreamOnce(buffer, cfg, options);
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

function uploadCourseThumbnailStreamOnce(
  buffer: Buffer,
  cfg: NonNullable<ReturnType<typeof getConfig>>
): Promise<{ url: string; publicId: string }> {
  return uploadBufferStreamOnce(buffer, cfg, {
    folder: DEFAULT_FOLDER,
    publicId: randomUUID(),
    resourceType: 'image',
    overwrite: false,
  });
}

/**
 * Upload an image buffer to Cloudinary. Returns HTTPS URL suitable for storing in `thumbnail_url`.
 * Retries a few times on network / Cloudinary timeout (499).
 */
export async function uploadCourseThumbnailToCloudinary(
  buffer: Buffer,
  mime: string
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

function uploadVideoStreamOnce(
  buffer: Buffer,
  cfg: NonNullable<ReturnType<typeof getConfig>>,
  folder: string
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
        folder,
        public_id: publicId,
        resource_type: 'video',
        overwrite: false,
        invalidate: true,
        timeout: VIDEO_UPLOAD_TIMEOUT_MS,
      },
      (err, result) => {
        if (err || !result?.secure_url) {
          reject(err ?? new Error('Cloudinary video upload failed'));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id ?? `${folder}/${publicId}`,
        });
      }
    );

    Readable.from(buffer).pipe(upload);
  });
}

/**
 * Upload a video buffer (e.g. a composited demo screencast MP4) to Cloudinary. Returns an
 * HTTPS URL suitable for storing in `LmsLesson.contentBody`. Mirrors the thumbnail uploader:
 * same config/retry-on-timeout behaviour, but `resource_type: 'video'` and a longer timeout.
 */
export async function uploadVideoToCloudinary(
  buffer: Buffer,
  folder: string = DEFAULT_VIDEO_FOLDER
): Promise<{ url: string; publicId: string }> {
  const cfg = getConfig();
  if (!cfg) {
    throw new Error('Cloudinary is not configured (set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)');
  }

  let lastErr: unknown;
  for (let attempt = 1; attempt <= UPLOAD_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await uploadVideoStreamOnce(buffer, cfg, folder);
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

/**
 * Upload a lesson narration MP3 to Cloudinary. Returns an HTTPS URL suitable for storing in a
 * lesson's `resources` JSON. Cloudinary stores audio under the `video` resource type, so this
 * reuses the same streaming/retry path as the demo-video uploader, only with the audio folder.
 */
export async function uploadCourseAudioToCloudinary(
  buffer: Buffer,
  folder: string = DEFAULT_AUDIO_FOLDER
): Promise<{ url: string; publicId: string }> {
  return uploadVideoToCloudinary(buffer, folder);
}

/**
 * Upload a completion certificate PDF to Cloudinary (`resource_type: raw`).
 * Returns a public HTTPS URL suitable for linking in IICRC renewal emails.
 */
export async function uploadCertificatePdfToCloudinary(
  buffer: Buffer,
  enrollmentId: string
): Promise<{ url: string; publicId: string }> {
  const safeId = enrollmentId.replace(/[^a-zA-Z0-9_-]/g, '');
  return uploadWithRetries(buffer, {
    folder: CERTIFICATE_FOLDER,
    publicId: safeId || randomUUID(),
    resourceType: 'raw',
    format: 'pdf',
    overwrite: true,
  });
}
