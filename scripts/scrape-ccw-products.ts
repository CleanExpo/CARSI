/**
 * Scrape CCW product + SDS data into `data/seed/ccw-products.json` using the Jina reader.
 *
 * Engine: Jina (https://r.jina.ai) — plain HTTPS:443, so it runs both locally and on Vercel,
 * and tunnels through restricted egress proxies (unlike a Bright Data CDP/websocket browser).
 *
 * Usage:
 *   # dry run (fetch + parse, print summary, write nothing)
 *   CCW_SCRAPE_BASE_URL="https://example-ccw-site/products" npm run ccw:scrape:plan
 *
 *   # full run (writes data/seed/ccw-products.json)
 *   CCW_SCRAPE_BASE_URL="https://example-ccw-site/products" JINA_API_KEY=... npm run ccw:scrape
 *
 * Flags (after `--`):
 *   --url <baseUrl>        Catalog/index page to start from (or env CCW_SCRAPE_BASE_URL)
 *   --plan | --dry-run     Do not write the JSON file
 *   --max <n>              Limit number of product pages fetched (default 50)
 *   --fetch-sds            Also fetch SDS documents and extract text + hazards (slower)
 *   --product-match <re>   Regex a link URL must match to be treated as a product page
 *   --sds-match <re>       Regex a link URL must match to be treated as an SDS document
 *                          (default: /sds|safety[-_ ]?data|\.pdf($|\?)/i)
 *   --out <path>           Output path (default data/seed/ccw-products.json)
 *
 * Loads `.env` when present via dotenv/config. Sets NODE_USE_ENV_PROXY so Node's fetch
 * honours HTTPS_PROXY in restricted-egress sessions.
 */
import 'dotenv/config';

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { jinaRead, type JinaLink } from '../src/lib/scrape/jina-reader';
import {
  CCW_PRODUCTS_CATALOG_VERSION,
  type CcwProduct,
  type CcwProductsCatalogFile,
  type CcwSdsRecord,
} from '../src/lib/seed/ccw-products-types';

// Ensure Node's built-in fetch routes through HTTPS_PROXY when one is configured.
if (process.env.HTTPS_PROXY && !process.env.NODE_USE_ENV_PROXY) {
  process.env.NODE_USE_ENV_PROXY = '1';
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUT = join(__dirname, '..', 'data', 'seed', 'ccw-products.json');

type Args = {
  url: string | null;
  plan: boolean;
  max: number;
  fetchSds: boolean;
  productMatch: RegExp | null;
  sdsMatch: RegExp;
  out: string;
};

function parseArgs(argv: string[]): Args {
  const get = (name: string): string | null => {
    const i = argv.indexOf(name);
    return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null;
  };
  const has = (name: string): boolean => argv.includes(name);
  return {
    url: get('--url') ?? process.env.CCW_SCRAPE_BASE_URL ?? null,
    plan: has('--plan') || has('--dry-run'),
    max: Number(get('--max') ?? '50') || 50,
    fetchSds: has('--fetch-sds'),
    productMatch: get('--product-match') ? new RegExp(get('--product-match') as string, 'i') : null,
    sdsMatch: new RegExp(get('--sds-match') ?? 'sds|safety[-_ ]?data|\\.pdf($|\\?)', 'i'),
    out: get('--out') ?? DEFAULT_OUT,
  };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/https?:\/\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function absoluteUrl(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

/** Same-origin, http(s), not an asset/mailto/anchor — candidate for a product page. */
function looksLikeProductLink(url: string, baseOrigin: string, productMatch: RegExp | null, sdsMatch: RegExp): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (!/^https?:$/.test(u.protocol)) return false;
  if (u.origin !== baseOrigin) return false;
  if (sdsMatch.test(u.pathname)) return false; // SDS, not a product page
  if (/\.(png|jpe?g|gif|svg|webp|css|js|ico|woff2?|ttf|zip|mp4)($|\?)/i.test(u.pathname)) return false;
  if (productMatch) return productMatch.test(u.pathname + u.search);
  // Default heuristic: a path with at least one non-trivial segment.
  return u.pathname.split('/').filter(Boolean).length >= 1;
}

function extractHazards(sdsText: string): string[] {
  const hazards = new Set<string>();
  // GHS hazard statement codes (H2xx/H3xx/H4xx) and their accompanying line.
  for (const m of sdsText.matchAll(/\bH\d{3}\b[^\n]*/g)) {
    hazards.add(m[0].trim().slice(0, 200));
  }
  for (const word of ['Danger', 'Warning']) {
    const re = new RegExp(`\\bSignal word[:\\s]*${word}\\b`, 'i');
    if (re.test(sdsText)) hazards.add(`Signal word: ${word}`);
  }
  return [...hazards].slice(0, 30);
}

function firstImage(images: string[], base: string): string | null {
  for (const img of images) {
    const abs = absoluteUrl(img, base);
    if (abs && /\.(png|jpe?g|webp)($|\?)/i.test(abs)) return abs;
  }
  return images.length ? absoluteUrl(images[0], base) : null;
}

/** Pull a short description from Jina markdown: first substantial paragraph. */
function extractDescription(markdown: string): string | null {
  const paras = markdown
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && !l.startsWith('![') && !l.startsWith('|') && l.length > 40);
  return paras.length ? paras[0].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').slice(0, 600) : null;
}

async function scrapeProduct(
  productUrl: string,
  args: Args,
  apiKey: string | undefined,
): Promise<CcwProduct | null> {
  let page;
  try {
    page = await jinaRead(productUrl, { apiKey, withLinks: true, withImages: true });
  } catch (err) {
    console.warn(`  ! skip ${productUrl}: ${(err as Error).message}`);
    return null;
  }

  const sdsLinks = page.links.filter((l: JinaLink) => {
    const abs = absoluteUrl(l.url, productUrl);
    return abs && args.sdsMatch.test(abs);
  });

  const sds: CcwSdsRecord[] = [];
  for (const link of sdsLinks) {
    const documentUrl = absoluteUrl(link.url, productUrl);
    if (!documentUrl) continue;
    let extractedText: string | null = null;
    let hazards: string[] = [];
    let issuedAt: string | null = null;
    if (args.fetchSds) {
      try {
        const doc = await jinaRead(documentUrl, { apiKey, withLinks: false, format: 'text' });
        extractedText = doc.content.slice(0, 20_000);
        hazards = extractHazards(doc.content);
        const dateMatch = doc.content.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
        issuedAt = dateMatch ? dateMatch[1] : null;
      } catch (err) {
        console.warn(`    ! SDS fetch failed ${documentUrl}: ${(err as Error).message}`);
      }
    }
    sds.push({ documentUrl, label: link.text || null, issuedAt, hazards, extractedText });
  }

  const name = page.title?.trim() || slugify(productUrl);
  return {
    slug: slugify(name) || slugify(productUrl),
    name,
    sourceUrl: productUrl,
    brand: null,
    category: null,
    description: extractDescription(page.content),
    imageUrl: firstImage(page.images, productUrl),
    sds,
    scrapedAt: new Date().toISOString(),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.url) {
    console.error(
      'No scrape target. Provide --url <baseUrl> or set CCW_SCRAPE_BASE_URL.\n' +
        'Example: CCW_SCRAPE_BASE_URL="https://ccw-site/products" npm run ccw:scrape:plan',
    );
    process.exit(1);
  }
  const apiKey = process.env.JINA_API_KEY;
  if (!apiKey) {
    console.warn('JINA_API_KEY not set — using Jina anonymously (lower rate limit).');
  }

  const baseOrigin = new URL(args.url).origin;
  console.log(`Scraping CCW products from ${args.url} (engine: jina, max ${args.max}${args.plan ? ', DRY RUN' : ''})`);

  const index = await jinaRead(args.url, { apiKey, withLinks: true });
  const candidates: string[] = [];
  const seen = new Set<string>();
  for (const link of index.links) {
    const abs = absoluteUrl(link.url, args.url);
    if (!abs) continue;
    if (!looksLikeProductLink(abs, baseOrigin, args.productMatch, args.sdsMatch)) continue;
    const key = abs.split('#')[0];
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push(key);
  }
  console.log(`Found ${candidates.length} candidate product links; fetching up to ${args.max}.`);

  const products: CcwProduct[] = [];
  for (const url of candidates.slice(0, args.max)) {
    const product = await scrapeProduct(url, args, apiKey);
    if (product) {
      products.push(product);
      console.log(`  + ${product.name} (${product.sds.length} SDS)`);
    }
  }

  products.sort((a, b) => a.slug.localeCompare(b.slug));
  const out: CcwProductsCatalogFile = {
    version: CCW_PRODUCTS_CATALOG_VERSION,
    scrapedAt: new Date().toISOString(),
    sourceBaseUrl: args.url,
    engine: 'jina',
    products,
  };

  const totalSds = products.reduce((n, p) => n + p.sds.length, 0);
  console.log(`\nScraped ${products.length} products, ${totalSds} SDS links.`);

  if (args.plan) {
    console.log('DRY RUN — not writing. Sample record:');
    console.log(JSON.stringify(products[0] ?? null, null, 2).slice(0, 1200));
    return;
  }
  writeFileSync(args.out, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${args.out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
