/**
 * Upload generated course hero images (output/course-images/<slug>-hero.png) to Cloudinary
 * and record slug -> URL in output/course-images/cloudinary-urls.json. Resumable (skips
 * slugs already in the manifest). Authoring tool — run manually, never in CI/runtime.
 *
 *   npx tsx scripts/upload-course-hero-images.ts
 *
 * Requires CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET in the env.
 */
import { config as loadEnv } from 'dotenv';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

loadEnv({ path: '.env.local' });
loadEnv();

const DIR = 'output/course-images';
const MANIFEST = join(DIR, 'cloudinary-urls.json');

async function main() {
  const { uploadCourseThumbnailToCloudinary, isCloudinaryConfigured } = await import(
    '../src/lib/server/cloudinary-upload'
  );
  if (!isCloudinaryConfigured()) {
    throw new Error(
      'Cloudinary is not configured (set CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET)'
    );
  }

  const heroes = readdirSync(DIR)
    .filter((f) => f.endsWith('-hero.png'))
    .sort();
  const manifest: Record<string, string> = existsSync(MANIFEST)
    ? JSON.parse(readFileSync(MANIFEST, 'utf8'))
    : {};

  let uploaded = 0;
  for (const f of heroes) {
    const slug = f.slice(0, -'-hero.png'.length);
    if (manifest[slug]) {
      console.log(`[skip] ${slug}`);
      continue;
    }
    const buffer = readFileSync(join(DIR, f));
    const { url } = await uploadCourseThumbnailToCloudinary(buffer, 'image/png');
    manifest[slug] = url;
    writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
    uploaded += 1;
    console.log(`[ok] ${slug} -> ${url}`);
  }
  console.log(`\nUploaded ${uploaded}. Manifest has ${Object.keys(manifest).length} URLs: ${MANIFEST}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
