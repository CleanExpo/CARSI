#!/usr/bin/env node
/**
 * Reticle production-leak scan (GP-596).
 *
 * Reticle is a development-only browser verification tool. It is kept out of production by two
 * things: the development-only branch in src/instrumentation-client.ts and the `withReticle`
 * wrapper in next.config.ts. Neither had a check. A manual scan of a production build found no
 * trace of it (PR #821 review), but that was on @reticlehq 2.x and the packages have since moved
 * to 3.x (#1096, #1279). This scan runs after `npm run build` in CI and fails on any hit, so a
 * change to either guard, or a package update that stops tree-shaking it, cannot ship silently.
 *
 * It reads every file under .next/static (what the browser downloads) and .next/server (what the
 * server runs), as raw bytes, and looks for each NEEDLE. It fails when:
 *   - any file contains a needle (each hit is printed with its file), or
 *   - a scan directory is missing, or holds no files. A scan that read nothing is not a pass.
 *
 * Non-vacuity is proven by scripts/check-reticle-build-leak.test.mjs, which plants each needle
 * in a temporary build tree and checks the missing and empty cases.
 *
 * Usage: node scripts/check-reticle-build-leak.mjs [--root <dir containing .next>]
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { isEntryPoint } from './lib/is-entry-point.mjs';

/** Strings that only appear when Reticle code or its configuration is in the bundle. */
export const NEEDLES = [
  'reticlehq', // package scope: @reticlehq/react, @reticlehq/next, @reticlehq/core
  'ReticleDev', // the dev overlay component
  'reticle-dev', // dev overlay element and route names
  'NEXT_PUBLIC_RETICLE', // the token, root and URL variables read in instrumentation-client.ts
  'carsi-0f3ff945', // this project's Reticle project id
];

/** Build output directories, relative to the root. Both must exist and hold files. */
export const SCAN_DIRS = ['.next/static', '.next/server'];

function listFiles(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, entry.name);
      if (entry.isDirectory()) stack.push(p);
      else if (entry.isFile()) out.push(p);
      else if (entry.isSymbolicLink() && statSync(p).isFile()) out.push(p);
    }
  }
  return out;
}

/**
 * Scan the build output under `root`.
 * @returns {{ scanned: Record<string, number>, hits: {file: string, needle: string}[], errors: string[] }}
 */
export function scanBuild(root) {
  const scanned = {};
  const hits = [];
  const errors = [];
  const needles = NEEDLES.map((n) => [n, Buffer.from(n, 'utf8')]);
  for (const rel of SCAN_DIRS) {
    const dir = join(root, rel);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) {
      errors.push(`${rel} is missing: run \`npm run build\` first`);
      scanned[rel] = 0;
      continue;
    }
    const files = listFiles(dir);
    scanned[rel] = files.length;
    if (files.length === 0) {
      errors.push(`${rel} holds no files, so nothing was scanned`);
      continue;
    }
    for (const file of files) {
      const bytes = readFileSync(file);
      for (const [needle, buf] of needles) {
        if (bytes.indexOf(buf) !== -1) hits.push({ file: relative(root, file), needle });
      }
    }
  }
  return { scanned, hits, errors };
}

if (isEntryPoint(import.meta.url)) {
  const i = process.argv.indexOf('--root');
  const root = resolve(i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : '.');
  const { scanned, hits, errors } = scanBuild(root);
  for (const [dir, n] of Object.entries(scanned)) console.log(`scanned ${n} files in ${dir}`);
  for (const e of errors) console.error(`✖ ${e}`);
  for (const h of hits) console.error(`✖ Reticle in production build: "${h.needle}" in ${h.file}`);
  if (errors.length || hits.length) {
    console.error(
      `\nReticle production-leak scan FAILED (${hits.length} hit(s), ${errors.length} error(s)).` +
        ' Reticle must stay development-only: check src/instrumentation-client.ts and next.config.ts.'
    );
    process.exit(1);
  }
  console.log(`\nNo Reticle code in the production build (${NEEDLES.length} needles).`);
}
