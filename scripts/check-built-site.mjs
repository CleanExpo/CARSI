#!/usr/bin/env node
/**
 * IICRC CEC terminology guard over the BUILT site (GP-711).
 *
 * check:iicrc-terminology reads source. This reads what `next build` emits, so copy assembled at
 * build time (data joined into pages, prerendered HTML, RSC payloads) is checked as served.
 *
 * Only what a visitor can be served is scanned. The first version of this check walked all of
 * `.next` except the top-level `cache` folder and never finished (13, 35 and 277 CPU minutes):
 *  - source maps (`*.map`) are never served, and are multi-megabyte single lines;
 *  - `.next/standalone` is a second, self-contained copy of the app (node_modules, src, docs,
 *    scripts, data and a nested `.next`), so every served file was scanned twice and thousands
 *    of files that are never served were scanned once;
 *  - `cache` (at any depth: webpack, images, fetch cache) holds build intermediates;
 *  - `*.nft.json` files are dependency traces (lists of file paths), not copy.
 * Every exclusion is printed with how much it skipped, so a skipped surface is visible, never
 * silent. A run that scans no files at all exits 2: a guard's silence is not a pass.
 *
 * Usage: node scripts/check-built-site.mjs [--dir .next] [--json]
 * Exit: 0 clean, 1 findings, 2 nothing to scan / bad input.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { isEntryPoint } from './lib/is-entry-point.mjs';
import { scanText } from './check-iicrc-terminology.mjs';

/** Directory names skipped wherever they appear under the build root. */
export const SKIP_DIRS = ['standalone', 'cache'];
/** File-name suffixes skipped. */
export const SKIP_SUFFIXES = ['.map', '.nft.json'];
/** Extensions that carry copy a visitor can be served: pages, chunks, RSC payloads, data. */
export const SERVED_EXT = /\.(?:html?|js|mjs|cjs|rsc|body|json|txt|xml|meta)$/i;

const HTML_COMMENT = /<!--[\s\S]*?-->/g;
/**
 * One tag, quoted attribute values included. No part of it may contain `<`: React escapes `<` in
 * attribute values (`&lt;`), so a served tag never holds one, and stopping there keeps the regex
 * linear. The source scanner's form (`[^>"']*` runs) retries to the end of the line from every
 * `<` that never closes, so a long line of unclosed tags (inline script text, minified markup)
 * cost 2.1s at 128k characters and 12x that at 4x the length (GP-711).
 */
export const HTML_TAG = /<\/?[A-Za-z](?:[^<>"']|"[^"<]*"|'[^'<]*')*>/g;

/**
 * Walk `root`, returning the files to scan and what was excluded and why.
 * @returns {{ files: string[], excluded: Record<string, { files: number, bytes: number }> }}
 */
export function listServedFiles(root) {
  const files = [];
  const excluded = {};
  const note = (reason, bytes) => {
    excluded[reason] ??= { files: 0, bytes: 0 };
    excluded[reason].files++;
    excluded[reason].bytes += bytes;
  };
  const countTree = (dir, reason) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) countTree(p, reason);
      else if (ent.isFile()) note(reason, statSync(p).size);
    }
  };
  const walk = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) {
        if (SKIP_DIRS.includes(ent.name)) countTree(p, `${ent.name}/ (not served)`);
        else walk(p);
      } else if (ent.isFile()) {
        const suffix = SKIP_SUFFIXES.find((s) => ent.name.endsWith(s));
        if (suffix) note(`*${suffix} (not served)`, statSync(p).size);
        else if (!SERVED_EXT.test(ent.name)) note('other extension (no copy)', statSync(p).size);
        else files.push(p);
      }
    }
  };
  walk(root);
  return { files: files.sort(), excluded };
}

/** Findings for one built file: every line as emitted, and for HTML its text with tags gone. */
export function scanBuiltFile(label, text) {
  const findings = [];
  const views = [text];
  if (/\.html?$/i.test(label) && text.includes('<')) {
    views.push(text.replace(HTML_COMMENT, '').replace(HTML_TAG, ' '));
  }
  const seen = new Set();
  for (const view of views) {
    const lines = view.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      for (const f of scanText(`${label}:${i + 1}`, lines[i])) {
        // scanText labels every hit line 1 of the text it was given; drop that suffix.
        const msg = f.replace(`${label}:${i + 1}:1:`, `${label}:${i + 1}:`);
        if (!seen.has(msg)) {
          seen.add(msg);
          findings.push(msg);
        }
      }
    }
  }
  return findings;
}

export function checkBuiltSite(root) {
  let st;
  try {
    st = statSync(root);
  } catch {
    return { error: `build directory not found: ${root} (run next build first)` };
  }
  if (!st.isDirectory()) return { error: `not a directory: ${root}` };
  const { files, excluded } = listServedFiles(root);
  const findings = [];
  let bytes = 0;
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    bytes += text.length;
    const label = relative(process.cwd(), file).split(sep).join('/');
    findings.push(...scanBuiltFile(label, text));
  }
  return { files, excluded, findings, bytes };
}

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

if (isEntryPoint(import.meta.url)) {
  const args = process.argv.slice(2);
  const dirAt = args.indexOf('--dir');
  const root = dirAt >= 0 ? args[dirAt + 1] : '.next';
  if (dirAt >= 0 && !root) {
    console.error('check-built-site: --dir needs a path');
    process.exit(2);
  }
  const started = performance.now();
  const result = checkBuiltSite(root);
  if (result.error) {
    console.error(`check-built-site: ${result.error}`);
    process.exit(2);
  }
  const { files, excluded, findings, bytes } = result;
  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  if (args.includes('--json')) {
    console.log(
      JSON.stringify({ root, scanned: files.length, bytes, excluded, findings, seconds })
    );
  } else {
    console.log(
      `check-built-site: scanned ${files.length} files (${mb(bytes)}) under ${root} in ${seconds}s`
    );
    for (const [reason, e] of Object.entries(excluded)) {
      console.log(`  excluded ${reason}: ${e.files} files, ${mb(e.bytes)}`);
    }
  }
  if (files.length === 0) {
    console.error(
      'check-built-site: no served files found to scan; refusing to pass on an empty build'
    );
    process.exit(2);
  }
  if (findings.length > 0) {
    console.error('\n✖ IICRC CEC terminology guard failed on the BUILT site (GP-711)\n');
    console.error(findings.join('\n'));
    process.exit(1);
  }
  console.log('✓ Built site passes the IICRC CEC terminology guard.');
  process.exit(0);
}
