#!/usr/bin/env node
/**
 * CEC course brand guard (licence-critical, fail-closed).
 *
 * Founder rule 19/10/2026: the CCW logo and name may not appear in any IICRC CEC accredited
 * course. They may appear in CCW-CARSI training materials and other marketing. A course is CEC
 * accredited when it has an approved entry in data/seed/cec-approvals.json (the SSOT).
 *
 * For every approved slug this scans each surface the course renders or ships:
 *   - its catalogue entry (every field: meta, modules, lessons, resources, thumbnail URL);
 *   - any JSON object under data/ keyed to the slug (slug / courseSlug / course field, or an
 *     object key equal to the slug): quiz seeds, assessment drafts, flashcards, slides, intro and
 *     lesson video briefs and results, voice briefs, thumbnail briefs, media manifests, the
 *     WordPress export the seed reads, and data/seo/course-cards/<slug>.json;
 *   - any JSON file under data/ whose file name is the slug (e.g. <slug>-quiz.json);
 *   - any tracked file under public/ with the slug in its path (public/courses/<slug>/*,
 *     thumbnails, media). Text files are read; binary files (PDF, images, video) are checked by
 *     path only, because their text is compressed. That is a documented limit, not a pass.
 *
 * Banned: "CCW" as a word (which also catches ccw-logo files and /ccw/ asset folders),
 * "Carpet Cleaners Warehouse", ccwonline.com.au, CCW's Shopify asset path, and the full name of
 * any product in data/seed/ccw-products.json. It fails when the registry, the product list or an
 * approved course's catalogue entry cannot be found: a missing input is never an empty pass.
 *
 * Fix a hit by removing the brand from the course. Never exempt a course here; if a course must
 * carry CCW material, it is not a CEC-approved course.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const SPACE = '\\s+';
const FIXED_TERMS = [
  { label: 'CCW', pattern: /\bccw\b/i },
  { label: 'CCW (letters split apart)', pattern: /\bc[\s._*-]*c[\s._*-]*w\b/i },
  { label: 'Carpet Cleaners Warehouse', pattern: new RegExp(`carpet${SPACE}cleaners${SPACE}warehouse`, 'i') },
  { label: 'ccwonline.com.au link', pattern: /ccw\s*online\s*\.\s*com\s*\.\s*au/i },
  { label: 'CCW image asset (Shopify store path)', pattern: /cdn\.shopify\.com\/s\/files\/1\/2179\/6391\b/i },
];
const SLUG_KEYS = ['slug', 'courseSlug', 'course_slug', 'course'];
/** Inputs to the guard, not course surfaces: the registry itself and the CCW product source list. */
const NOT_SURFACES = new Set(['data/seed/cec-approvals.json', 'data/seed/ccw-products.json']);
const TEXT_EXT = /\.(html?|md|mdx|txt|json|svg|vtt|srt|csv|xml|js|css)$/i;
const MIN_PRODUCTS = 50;

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function productPattern(name) {
  const body = name.trim().split(/\s+/).map(escapeRegExp).join(SPACE);
  return new RegExp(`(?<![\\w-])${body}(?![\\w-])`, 'i');
}

const productPatternCache = new Map();
function productPatterns(names) {
  const key = names.join('\n');
  if (!productPatternCache.has(key)) {
    productPatternCache.set(key, names.map((name) => ({ label: `CCW product "${name}"`, pattern: productPattern(name) })));
  }
  return productPatternCache.get(key);
}

/** Named HTML entities that can spell out a brand term (letters have no named entity). */
const NAMED_ENTITIES = {
  amp: '&', nbsp: ' ', NonBreakingSpace: ' ', ensp: ' ', emsp: ' ', thinsp: ' ', hairsp: ' ',
  Tab: ' ', NewLine: ' ', period: '.', sol: '/', colon: ':', hyphen: '-', dash: '-', lowbar: '_',
  ast: '*', midast: '*', quot: '"', apos: "'", lt: '<', gt: '>', commat: '@', num: '#', percnt: '%',
  shy: '', ZeroWidthSpace: '', zwj: '', zwnj: '', NoBreak: '',
};
const decodeCodePoint = (n) => (n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '');

function decodeOnce(text) {
  return text
    .replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\x([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\[nrtbfv]/g, ' ')
    .replace(/\\([\\/"'])/g, '$1')
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => decodeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, dec) => decodeCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (entity, name) => NAMED_ENTITIES[name] ?? entity)
    .replace(/%([0-7][0-9a-f])/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * The text as a reader sees it: JSON/JS escapes, HTML entities (also double-encoded) and URL
 * percent-escapes decoded, compatibility forms (fullwidth letters) folded, invisible characters
 * removed and every run of whitespace collapsed to one space. Without this, "C\nC\nW" in a JSON
 * surface or "&#67;CW" in a lesson body renders as the brand but evades every pattern.
 */
export function normaliseForScan(text) {
  let out = text;
  for (let i = 0; i < 5; i += 1) {
    const next = decodeOnce(out);
    if (next === out) break;
    out = next;
  }
  return out
    .normalize('NFKC')
    .replace(/[­​-‍⁠﻿]/g, '')
    .replace(/\s+/g, ' ');
}

/** Labels of every CCW brand form found in the text, as written or as rendered (markup removed). */
export function brandHits(text, productNames) {
  const normal = normaliseForScan(text);
  const views = [normal, normal.replace(/<[^>]*>/g, '')];
  return [...FIXED_TERMS, ...productPatterns(productNames)]
    .filter(({ pattern }) => views.some((view) => pattern.test(view)))
    .map(({ label }) => label);
}

function slugFromFileName(path) {
  return basename(path).replace(/(-quiz|\.quizzes|\.script)?\.json$/, '');
}

/** Every part of one JSON document that belongs to an approved course. */
function jsonSurfaces(path, data, approved) {
  const out = [];
  const fileSlug = slugFromFileName(path);
  if (approved.has(fileSlug)) {
    out.push({ slug: fileSlug, where: `${path} (file)`, text: JSON.stringify(data) });
    return out;
  }
  const walk = (node, trail) => {
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, `${trail}[${i}]`));
      return;
    }
    if (!node || typeof node !== 'object') return;
    const key = SLUG_KEYS.find((k) => typeof node[k] === 'string' && approved.has(node[k]));
    if (key) {
      out.push({ slug: node[key], where: `${path} ${trail || '(root)'}`, text: JSON.stringify(node) });
      return;
    }
    for (const [k, value] of Object.entries(node)) {
      if (approved.has(k)) out.push({ slug: k, where: `${path} ${trail}.${k}`, text: JSON.stringify(value) });
      else walk(value, `${trail}.${k}`);
    }
  };
  walk(data, '');
  return out;
}

/**
 * inputs: { approvedSlugs: string[], productNames: string[],
 *           jsonFiles: { path, data }[], publicFiles: { path, text: string | null }[] }
 */
export function evaluate(inputs) {
  const findings = [];
  const surfaces = [];
  if (inputs.approvedSlugs.length === 0) {
    findings.push('  data/seed/cec-approvals.json: no approved courses read from the CEC registry; refusing to pass on an empty scope');
  }
  if (inputs.productNames.length < MIN_PRODUCTS) {
    findings.push(`  data/seed/ccw-products.json: ${inputs.productNames.length} CCW product names read (need ${MIN_PRODUCTS}+); refusing to pass`);
  }
  const approved = new Set(inputs.approvedSlugs);
  for (const { path, data } of inputs.jsonFiles) {
    if (!NOT_SURFACES.has(path)) surfaces.push(...jsonSurfaces(path, data, approved));
  }
  for (const { path, text } of inputs.publicFiles) {
    for (const slug of approved) {
      if (path.split('/').some((part) => part === slug || part.startsWith(`${slug}.`) || part.startsWith(`${slug}-`))) {
        surfaces.push({ slug, where: path, text: `${path}\n${text ?? ''}` });
      }
    }
  }
  const catalogued = new Set(
    surfaces.filter((s) => s.where.startsWith('data/seed/courses-catalog.json')).map((s) => s.slug)
  );
  for (const slug of approved) {
    if (!catalogued.has(slug)) {
      findings.push(`  ${slug}: CEC-approved but has no catalogue entry (data/seed/courses-catalog.json); cannot prove it is CCW-free`);
    }
  }
  for (const { slug, where, text } of surfaces) {
    const hits = brandHits(text, inputs.productNames);
    if (hits.length > 0) findings.push(`  ${slug}: ${where} contains ${hits.join(', ')}`);
  }
  return { findings, surfaces };
}

function readJson(root, path) {
  return JSON.parse(readFileSync(join(root, path), 'utf8'));
}

/** The real repository inputs. A read failure throws: the caller turns it into a failure. */
export function loadRepoInputs(root) {
  const approvedSlugs = (readJson(root, 'data/seed/cec-approvals.json').approvals ?? [])
    .filter((entry) => entry.status === 'approved' && typeof entry.slug === 'string')
    .map((entry) => entry.slug);
  const productNames = [
    ...new Set(
      (readJson(root, 'data/seed/ccw-products.json').products ?? [])
        .map((product) => product.name)
        .filter((name) => typeof name === 'string' && name.trim())
    ),
  ];
  const tracked = execSync('git ls-files --cached --others --exclude-standard -- data public', {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
  })
    .split('\n')
    .map((f) => f.trim())
    .filter(Boolean);
  const jsonFiles = tracked
    .filter((f) => f.startsWith('data/') && f.endsWith('.json'))
    .map((path) => ({ path, data: readJson(root, path) }));
  const approved = new Set(approvedSlugs);
  const publicFiles = tracked
    .filter((f) => f.startsWith('public/') && [...approved].some((slug) => f.includes(slug)))
    .map((path) => ({ path, text: TEXT_EXT.test(path) ? readFileSync(join(root, path), 'utf8') : null }));
  return { approvedSlugs, productNames, jsonFiles, publicFiles };
}

function main() {
  let result;
  try {
    result = evaluate(loadRepoInputs(process.cwd()));
  } catch (err) {
    console.error(`✖ CEC course brand guard could not read its inputs: ${err.message}`);
    process.exit(1);
  }
  const { findings, surfaces } = result;
  if (findings.length > 0) {
    console.error(`\n✖ CEC course brand guard failed — ${findings.length} issue(s)\n`);
    console.error('A CEC-approved course may not carry the CCW name, logo, links or product names.');
    console.error('CCW material belongs in CCW-CARSI training and marketing, never in a CEC course. Fix these:\n');
    console.error(findings.join('\n'));
    console.error('\nSee CLAUDE.md § "IICRC CEC terminology".\n');
    process.exit(1);
  }
  const courses = new Set(surfaces.map((s) => s.slug)).size;
  console.log(`✓ CEC course brand guard passed — ${courses} CEC-approved courses, ${surfaces.length} surfaces, no CCW brand.`);
  process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
