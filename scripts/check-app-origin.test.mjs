#!/usr/bin/env node
/**
 * Non-vacuity proof for the site-address guard (scripts/check-app-origin.mjs, GP-756).
 *
 * Every MUST_BLOCK case is a shape that was live in the repository before GP-756. If the guard
 * is made inert, this goes red.
 */
import { evaluateFile } from './check-app-origin.mjs';

const MUST_BLOCK = [
  [
    'env fallback to localhost (teams invite, middleware CSP)',
    "const appUrl = (\n  process.env.NEXT_PUBLIC_APP_URL ||\n  process.env.NEXT_PUBLIC_FRONTEND_URL ||\n  'http://localhost:3000'\n).replace(/\\/$/, '');",
  ],
  [
    'env with SITE_URL fallback (credential-public)',
    "const origin = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://carsi.com.au';",
  ],
  [
    'request URL origin fallback (certificate routes)',
    "const origin = process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(request.url).origin;",
  ],
  ['bare request URL origin', 'const o = new URL(req.url).origin;'],
  [
    'host header read (old getServerOrigin)',
    "const host = h.get('x-forwarded-host') ?? h.get('host');",
  ],
];

const MUST_PASS = [
  ['the helper call', "import { getAppOrigin } from '@/lib/server/app-url';\nconst o = getAppOrigin(request);"],
  ['a comment naming the variable', '// NEXT_PUBLIC_APP_URL is read by getAppOrigin\nconst o = getAppOrigin();'],
  ['request pathname, not origin', 'const p = new URL(request.url).pathname;'],
  ['an unrelated header', "const ua = request.headers.get('user-agent');"],
];

let failed = 0;
for (const [name, src] of MUST_BLOCK) {
  const hits = evaluateFile('app/api/probe/route.ts', src);
  if (hits.length === 0) {
    console.error(`✖ MUST_BLOCK not caught: ${name}`);
    failed++;
  } else console.log(`✓ blocks: ${name}`);
}
for (const [name, src] of MUST_PASS) {
  const hits = evaluateFile('app/api/probe/route.ts', src);
  if (hits.length > 0) {
    console.error(`✖ MUST_PASS flagged: ${name} → ${JSON.stringify(hits)}`);
    failed++;
  } else console.log(`✓ passes: ${name}`);
}
// The allow-list must not swallow an ordinary file.
if (evaluateFile('src/lib/server/not-app-url.ts', MUST_BLOCK[0][1]).length === 0) {
  console.error('✖ allow-list matched a file it should not');
  failed++;
}

console.log(failed === 0 ? '\nAll site-address guard cases hold.' : `\n${failed} case(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
