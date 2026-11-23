#!/usr/bin/env node
/**
 * Add stub provenance entries for public media missing from config/media.manifest.json.
 * Default: dry-run. Pass --write to update the manifest.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.MANIFEST_SYNC_ROOT
  ? join(process.env.MANIFEST_SYNC_ROOT)
  : join(dirname(fileURLToPath(import.meta.url)), '../..');
const MANIFEST = join(ROOT, 'config/media.manifest.json');
/** Raster only — video entries need a poster (add manually). SVG diagram assets use allowlist, not manifest. */
const MEDIA_EXTS = new Set(['webp', 'avif', 'jpg', 'jpeg', 'png', 'gif']);
const PUBLIC = join(ROOT, 'public');

const write = process.argv.includes('--write');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function kindFor(ext) {
  if (['mp4', 'webm', 'mov'].includes(ext)) return 'video';
  return 'image';
}

function classify(publicPath) {
  if (publicPath.startsWith('/courses/')) return { source: 'client', credit: 'CARSI course media — verify rights and alt text' };
  if (publicPath.startsWith('/icons/') || publicPath.startsWith('/images/badges/'))
    return { source: 'client', credit: 'CARSI brand asset' };
  if (publicPath.startsWith('/margot/'))
    return { source: 'generated', credit: 'CARSI Margot guide avatar' };
  return { source: 'client', credit: 'CARSI self-hosted asset — verify rights' };
}

function altFromPath(publicPath) {
  const base = publicPath.split('/').pop()?.replace(/\.[^.]+$/, '') ?? 'image';
  return base.replace(/[-_]+/g, ' ');
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
} catch (e) {
  console.error(`Cannot read ${MANIFEST}: ${e.message}`);
  process.exit(2);
}
if (!Array.isArray(manifest.entries)) {
  console.error('manifest.entries must be an array');
  process.exit(2);
}

const known = new Set(manifest.entries.map((e) => e.src));
const files = walk(PUBLIC).filter((f) => MEDIA_EXTS.has(extname(f).slice(1).toLowerCase()));

const additions = [];
for (const f of files) {
  const publicPath = '/' + relative(PUBLIC, f).split(/[/\\]/).join('/');
  if (known.has(publicPath)) continue;
  const ext = extname(f).slice(1).toLowerCase();
  const { source, credit } = classify(publicPath);
  additions.push({
    src: publicPath,
    kind: kindFor(ext),
    source,
    credit,
    alt: altFromPath(publicPath),
  });
}

additions.sort((a, b) => a.src.localeCompare(b.src));

if (!additions.length) {
  console.log('No missing public media entries.');
  process.exit(0);
}

console.log(`${additions.length} public file(s) missing from media.manifest.json`);
for (const a of additions.slice(0, 20)) console.log(`  + ${a.src}`);
if (additions.length > 20) console.log(`  ... and ${additions.length - 20} more`);

if (!write) {
  console.log('\nDry run. Re-run with --write to append entries.');
  process.exit(0);
}

manifest.entries = [...manifest.entries, ...additions].sort((a, b) => a.src.localeCompare(b.src));
writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Wrote ${additions.length} entries to ${relative(ROOT, MANIFEST)}`);