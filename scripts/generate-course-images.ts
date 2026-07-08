/**
 * Generate realistic course images via the Gemini (Nano Banana) image client and upload them to
 * Cloudinary. Authoring tool — run manually, never in CI/runtime. **Spends real money.**
 *
 * Briefs live in `data/course-images/<slug>.json`. Each image is generated from delivered-content
 * prompts only (text-free imagery; Bird Flu stays calm/non-alarming per the course discipline).
 *
 *   # Free — review the exact prompts before any spend:
 *   npx tsx scripts/generate-course-images.ts --slug=<slug> --dry-run
 *
 *   # Spend — generate up to --limit images (default 2), resumable via the manifest:
 *   npx tsx scripts/generate-course-images.ts --slug=<slug> --generate --limit=1
 *
 * Requires GEMINI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY and Cloudinary creds in the env.
 * Output manifest: output/course-images/<slug>.manifest.json (URLs written here, resumable).
 */
import { config as loadEnv } from 'dotenv';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Load env BEFORE importing the Gemini client (it reads the key at module load).
loadEnv({ path: '.env.local' });
loadEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

type ImageBrief = {
  id: string;
  context: string;
  category: string;
  aspectRatio: string;
  resolution: string;
  style: string;
  prompt: string;
  negativePrompt?: string;
};
type BriefFile = { courseSlug: string; brandColors: string[]; notes?: string; images: ImageBrief[] };

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : undefined;
}
const has = (name: string) => process.argv.includes(`--${name}`);

async function main() {
  const slug = arg('slug');
  if (!slug) throw new Error('Pass --slug=<course-slug>');
  const dryRun = has('dry-run') || !has('generate');
  const limit = Number(arg('limit') ?? '2');

  const briefPath = join(ROOT, 'data', 'course-images', `${slug}.json`);
  const brief: BriefFile = JSON.parse(readFileSync(briefPath, 'utf8'));
  console.log(`\n=== Course images: ${slug} ===`);
  if (brief.notes) console.log(`Guardrails: ${brief.notes}\n`);

  if (dryRun) {
    console.log(`DRY-RUN — ${brief.images.length} image prompt(s). No API call, no spend.\n`);
    for (const img of brief.images) {
      console.log(`── [${img.id}] ${img.category} · ${img.aspectRatio} · ${img.style}`);
      console.log(`   context: ${img.context}`);
      console.log(`   PROMPT: ${img.prompt}`);
      console.log(`   palette: ${brief.brandColors.join(', ')}`);
      if (img.negativePrompt) console.log(`   AVOID: ${img.negativePrompt}`);
      console.log('');
    }
    console.log('Review the prompts. To generate: add --generate (spends money).');
    return;
  }

  // ---- generate (spend) ----
  const { generateImage } = await import('../src/lib/image-generation/gemini-client');
  const { uploadCourseThumbnailToCloudinary } = await import('../src/lib/server/cloudinary-upload');

  const outDir = join(ROOT, 'output', 'course-images');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const manifestPath = join(outDir, `${slug}.manifest.json`);
  const manifest: Record<string, { url: string; publicId: string; alt: string; at: string }> =
    existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};

  let generated = 0;
  for (const img of brief.images) {
    if (generated >= limit) {
      console.log(`Hit --limit=${limit}; stopping (resumable via manifest).`);
      break;
    }
    if (manifest[img.id]) {
      console.log(`[skip] ${img.id} already in manifest → ${manifest[img.id].url}`);
      continue;
    }
    console.log(`[generate] ${img.id} …`);
    const result = await generateImage({
      prompt: img.prompt,
      context: img.context,
      brandColors: brief.brandColors,
      aspectRatio: img.aspectRatio as never,
      resolution: img.resolution as never,
      style: img.style as never,
      category: img.category as never,
      negativePrompt: img.negativePrompt,
    });
    const buffer = Buffer.from(result.data, 'base64');
    if (has('save-local')) {
      const ext = result.mimeType === 'image/jpeg' ? 'jpg' : result.mimeType === 'image/webp' ? 'webp' : 'png';
      const localPath = join(outDir, `${slug}-${img.id}.${ext}`);
      writeFileSync(localPath, buffer);
      manifest[img.id] = { url: localPath, publicId: 'local', alt: result.altText, at: new Date().toISOString() };
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      generated += 1;
      console.log(`   ✓ saved local: ${localPath} (${buffer.length} bytes)`);
    } else {
      const { url, publicId } = await uploadCourseThumbnailToCloudinary(buffer, result.mimeType);
      manifest[img.id] = { url, publicId, alt: result.altText, at: new Date().toISOString() };
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      generated += 1;
      console.log(`   ✓ ${url}`);
    }
  }
  console.log(`\nGenerated ${generated} image(s). Manifest: ${manifestPath}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
