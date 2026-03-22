#!/usr/bin/env npx ts-node
/**
 * Generate Next.js Redirect Configuration
 *
 * Reads data/wordpress-export/url-redirects.json and outputs
 * a redirects array for next.config.ts
 *
 * Usage:
 *   npx ts-node scripts/generate-redirects.ts
 *   npx ts-node scripts/generate-redirects.ts --output next.config.redirects.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface URLRedirect {
  old_path: string;
  new_path: string;
  status_code: 301 | 302;
}

const INPUT_FILE = path.join(__dirname, '..', 'data', 'wordpress-export', 'url-redirects.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'apps', 'web', 'redirects.config.ts');

function main() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Input file not found: ${INPUT_FILE}`);
    console.error('Run wp-migrate.ts first to generate the redirects JSON');
    process.exit(1);
  }

  const redirects: URLRedirect[] = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));

  const lines: string[] = [
    '/**',
    ' * WordPress URL Redirects',
    ' * Auto-generated from wp-migrate.ts export',
    ` * Generated: ${new Date().toISOString()}`,
    ' */',
    '',
    "import type { Redirect } from 'next/dist/lib/load-custom-routes';",
    '',
    'export const wordpressRedirects: Redirect[] = [',
  ];

  for (const redirect of redirects) {
    // Skip if source and destination are the same
    if (redirect.old_path === redirect.new_path) continue;

    // Convert WordPress paths to Next.js source patterns
    let source = redirect.old_path;

    // Handle trailing slashes
    if (source.endsWith('/') && source !== '/') {
      source = source.slice(0, -1);
    }

    lines.push('  {');
    lines.push(`    source: '${source}',`);
    lines.push(`    destination: '${redirect.new_path}',`);
    lines.push(`    permanent: ${redirect.status_code === 301},`);
    lines.push('  },');
  }

  // Add common WordPress URL patterns that should redirect
  lines.push('  // Common WordPress URL patterns');
  lines.push('  {');
  lines.push("    source: '/wp-admin/:path*',");
  lines.push("    destination: '/admin',");
  lines.push('    permanent: true,');
  lines.push('  },');
  lines.push('  {');
  lines.push("    source: '/wp-login.php',");
  lines.push("    destination: '/login',");
  lines.push('    permanent: true,');
  lines.push('  },');
  lines.push('  {');
  lines.push("    source: '/wp-content/:path*',");
  lines.push("    destination: '/',");
  lines.push('    permanent: false,');
  lines.push('  },');
  lines.push('  {');
  lines.push("    source: '/feed/:path*',");
  lines.push("    destination: '/api/rss',");
  lines.push('    permanent: true,');
  lines.push('  },');

  lines.push('];');
  lines.push('');
  lines.push('export default wordpressRedirects;');
  lines.push('');

  fs.writeFileSync(OUTPUT_FILE, lines.join('\n'));
  console.log(`Generated: ${OUTPUT_FILE}`);
  console.log(`Total redirects: ${redirects.length}`);
  console.log('');
  console.log('Add to your next.config.ts:');
  console.log('');
  console.log("  import { wordpressRedirects } from './redirects.config';");
  console.log('');
  console.log('  // In your config:');
  console.log('  async redirects() {');
  console.log('    return wordpressRedirects;');
  console.log('  },');
}

main();
