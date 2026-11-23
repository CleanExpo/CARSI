#!/usr/bin/env node
/**
 * Site-address guard (GP-756).
 *
 * `getAppOrigin` (src/lib/server/app-url.ts) is the one rule for the site address that goes
 * into links, emails, certificates and the CSP: configured app URL first, the request's own
 * origin only as a fallback, and never a local address in production. GP-700 (PR #1180) moved
 * the request-driven builders onto it; GP-756 moved the rest. Before that, six files each built
 * their own origin with a different fallback, and two of them fell back to
 * http://localhost:3000 in production.
 *
 * This guard stops a new hand-built origin from being written. It flags, in app/ and src/:
 *   - env-url      a read of NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_FRONTEND_URL or NEXT_PUBLIC_SITE_URL
 *   - request-url  `new URL(request.url).origin` (or `req.url`)
 *   - host-header  a read of the `host` or `x-forwarded-host` request header
 *
 * Fix a hit by calling getAppOrigin(). Fix a false positive by adding the file to ALLOW_FILES
 * with its reason, never by disabling a rule.
 *
 * Non-vacuity is proven by scripts/check-app-origin.test.mjs, which feeds planted bad input
 * through evaluateFile().
 *
 * Bad-input recipe (should exit 1):
 *   mkdir -p app/__origin_probe__ && \
 *   echo "export const u = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';" \
 *     > app/__origin_probe__/probe.ts && \
 *   node scripts/check-app-origin.mjs; echo "exit $?"; rm -r app/__origin_probe__
 *
 * Usage: node scripts/check-app-origin.mjs [--json]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { isEntryPoint } from './lib/is-entry-point.mjs';

const SCAN_DIRS = ['app', 'src'];
const SKIP = [/src\/generated\//, /\.test\.[tj]sx?$/, /node_modules/];

/** Files allowed to read these values, each with its reason. */
export const ALLOW_FILES = [
  // The helper itself.
  { re: /src\/lib\/server\/app-url\.ts$/, why: 'getAppOrigin, the one rule' },
  // SEO canonical / metadataBase. FRONTEND_URL comes first here, the reverse of getAppOrigin.
  // Moving it changes canonical tags if the two values ever differ: a decision for Phill.
  { re: /src\/lib\/env\/public-url\.ts$/, why: 'SEO canonical URL, precedence differs (GP-756 open item)' },
  // Client-side config object; not a server-built link.
  { re: /src\/lib\/config\.ts$/, why: 'client config default' },
  // HTTP-Referer sent to OpenRouter, not a link anyone follows.
  { re: /src\/lib\/openrouter\/provider\.ts$/, why: 'outbound Referer header' },
  // Cron-only self-probe of the API routes; it calls the host that served it.
  { re: /app\/api\/health\/routes\/route\.ts$/, why: 'internal self-probe, cron-only' },
  // Server-component adapter: reads the host headers and hands them to getAppOrigin as a fallback.
  { re: /src\/lib\/server\/request-origin\.ts$/, why: 'passes host into getAppOrigin' },
];

const RULES = [
  { id: 'env-url', re: /process\.env\.NEXT_PUBLIC_(?:APP|FRONTEND|SITE)_URL\b/g },
  { id: 'request-url', re: /new\s+URL\(\s*(?:request|req)\.url\s*\)\.origin/g },
  { id: 'host-header', re: /\.get\(\s*['"](?:x-forwarded-host|host)['"]\s*\)/gi },
];

/** Findings for one source. Exported so the self-test can plant bad input. */
export function evaluateFile(file, text) {
  const norm = file.replaceAll('\\', '/');
  if (ALLOW_FILES.some((a) => a.re.test(norm))) return [];
  const lines = text.split('\n');
  const findings = [];
  for (const rule of RULES) {
    for (const m of text.matchAll(rule.re)) {
      const lineNo = text.slice(0, m.index ?? 0).split('\n').length;
      const line = lines[lineNo - 1] ?? '';
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue; // comment
      findings.push({ file: norm, line: lineNo, rule: rule.id, text: line.trim().slice(0, 120) });
    }
  }
  return findings;
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e);
    if (SKIP.some((r) => r.test(p.replaceAll('\\', '/')))) continue;
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (['.ts', '.tsx'].includes(extname(p))) out.push(p);
  }
  return out;
}

if (isEntryPoint(import.meta.url)) {
  const files = SCAN_DIRS.flatMap((d) => walk(d));
  if (files.length === 0) {
    console.error('✖ check-app-origin scanned no files. Run it from the repository root.');
    process.exit(2);
  }
  const findings = files.flatMap((f) => evaluateFile(f, readFileSync(f, 'utf8')));

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ scanned: files.length, findings }, null, 2));
  } else if (findings.length === 0) {
    console.log(`\n✓ No hand-built site origin in ${files.length} files. getAppOrigin is the one rule.\n`);
  } else {
    console.log('\n✖ Hand-built site origin\n');
    console.log('  Build site addresses with getAppOrigin() from src/lib/server/app-url.ts (GP-756).\n');
    for (const f of findings) console.log(`  ${f.file}:${f.line} [${f.rule}]\n    → ${f.text}`);
    console.log('');
  }

  process.exit(findings.length === 0 ? 0 : 1);
}
