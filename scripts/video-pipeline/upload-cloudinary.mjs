/* Upload a rendered lesson MP4 to Cloudinary.
 * Reads CLOUDINARY_* from .env. Usage:
 *   node scripts/video-pipeline/upload-cloudinary.mjs <path-to-mp4> [publicId]
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { v2 as cloudinary } from 'cloudinary';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

// minimal .env loader (no extra deps)
const env = {};
try {
  const raw = await readFile(path.join(ROOT, '.env'), 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {}

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET,
});

const file = process.argv[2];
const publicId = process.argv[3];
if (!file) { console.error('usage: upload-cloudinary.mjs <mp4> [publicId]'); process.exit(1); }

const res = await cloudinary.uploader.upload(file, {
  resource_type: 'video',
  folder: 'carsi/lesson-videos',
  public_id: publicId,
  overwrite: true,
});
console.log('secure_url:', res.secure_url);
console.log('duration  :', res.duration, 's');
console.log('bytes     :', res.bytes);
