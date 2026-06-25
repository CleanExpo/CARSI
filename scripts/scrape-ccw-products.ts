/**
 * Scrape CCW product + SDS data into `data/seed/ccw-products.json`.
 *
 * Two engines, auto-selected:
 *   - shopify (default when the store exposes /products.json): pulls real products from
 *     Shopify's public product feed, then reads the site's Safety Data Sheets page for the
 *     real SDS PDFs and matches them to products by name.
 *   - jina (fallback for non-Shopify sites): crawls links via the Jina reader (HTTPS:443).
 *
 * Usage:
 *   CCW_SCRAPE_BASE_URL="https://ccwonline.com.au/" npm run ccw:scrape:plan   # dry run
 *   CCW_SCRAPE_BASE_URL="https://ccwonline.com.au/" npm run ccw:scrape         # writes JSON
 *
 * Flags (after `--`):
 *   --url <baseUrl>        Store/index URL (or env CCW_SCRAPE_BASE_URL)
 *   --plan | --dry-run     Do not write the JSON file
 *   --max <n>              Max products to fetch (default 250)
 *   --shopify | --no-shopify   Force/disable the Shopify engine (default: auto-detect)
 *   --sds-page <url>       SDS index page to read (default: auto-discover, then
 *                          /blogs/safety-data-sheets)
 *   --fetch-sds            Also download each SDS PDF (via Jina) to extract text + hazards
 *   --product-match <re>   (jina engine) regex a link must match to be a product page
 *   --sds-match <re>       (jina engine) regex for SDS document links
 *   --out <path>           Output path (default data/seed/ccw-products.json)
 */
import 'dotenv/config';

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { jinaRead, type JinaLink, type JinaReadResult } from '../src/lib/scrape/jina-reader';
import { fetchShopifyProducts, isShopifyStore, type ShopifyProduct } from '../src/lib/scrape/shopify';
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

const USER_AGENT = 'Mozilla/5.0 (compatible; CARSI-CCW-Scraper/1.0)';
const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUT = join(__dirname, '..', 'data', 'seed', 'ccw-products.json');

type Args = {
  url: string | null;
  plan: boolean;
  max: number;
  shopify: 'auto' | 'on' | 'off';
  sdsPage: string | null;
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
    max: (() => {
      const n = Number(get('--max') ?? '250');
      return Number.isFinite(n) && n >= 0 ? n : 250;
    })(),
    shopify: has('--no-shopify') ? 'off' : has('--shopify') ? 'on' : 'auto',
    sdsPage: get('--sds-page') ?? process.env.CCW_SDS_PAGE ?? null,
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

/** Strip HTML tags and decode a few common entities to plain text. */
function htmlToText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&rsquo;|&apos;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

async function httpGetText(url: string, timeoutMs = 45_000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function deriveSdsLabel(url: string): string {
  try {
    const last = new URL(url).pathname.split('/').filter(Boolean).pop() ?? url;
    return decodeURIComponent(last)
      .replace(/\.pdf$/i, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch {
    return url;
  }
}

function extractHazards(sdsText: string): string[] {
  const hazards = new Set<string>();
  for (const m of sdsText.matchAll(/\bH\d{3}\b[^\n]*/g)) hazards.add(m[0].trim().slice(0, 200));
  for (const word of ['Danger', 'Warning']) {
    if (new RegExp(`\\bSignal word[:\\s]*${word}\\b`, 'i').test(sdsText)) hazards.add(`Signal word: ${word}`);
  }
  return [...hazards].slice(0, 30);
}

/**
 * Build the SDS library: find the site's Safety Data Sheets page(s) and collect every PDF
 * link. Tries an explicit page, the conventional /blogs/safety-data-sheets path, and any
 * SDS-looking link discovered on the homepage.
 */
async function fetchSdsLibrary(baseUrl: string, sdsPageInput: string | null): Promise<CcwSdsRecord[]> {
  const origin = new URL(baseUrl).origin;
  const pages: string[] = [];
  if (sdsPageInput) {
    const abs = absoluteUrl(sdsPageInput, origin);
    if (abs) pages.push(abs);
  }
  pages.push(`${origin}/blogs/safety-data-sheets`);

  try {
    const home = await httpGetText(baseUrl);
    for (const m of home.matchAll(/href="([^"]+)"/gi)) {
      if (/safety[-_]?data|(^|[/-])sds([/-]|$)/i.test(m[1])) {
        const abs = absoluteUrl(m[1], baseUrl);
        if (abs) pages.push(abs);
      }
    }
  } catch {
    // homepage scan is best-effort
  }

  const sds = new Map<string, CcwSdsRecord>();
  const seenPages = new Set<string>();
  for (const page of pages) {
    const key = page.split('#')[0];
    if (seenPages.has(key)) continue;
    seenPages.add(key);
    let html: string;
    try {
      html = await httpGetText(key);
    } catch {
      continue;
    }
    for (const m of html.matchAll(/href="([^"]+\.pdf[^"]*)"/gi)) {
      const abs = absoluteUrl(m[1], key);
      if (!abs || sds.has(abs)) continue;
      sds.set(abs, { documentUrl: abs, label: deriveSdsLabel(abs), issuedAt: null, hazards: [], extractedText: null });
    }
  }
  return [...sds.values()];
}

const SDS_STOPWORDS = new Set([
  'cleaning', 'cleaner', 'cleaners', 'restoration', 'equipment', 'system', 'systems',
  'australia', 'portable', 'portables', 'machine', 'tools', 'product', 'products',
]);

/** Best-effort match of SDS documents to a product by handle/name tokens. */
function matchSdsToProduct(product: CcwProduct, library: CcwSdsRecord[]): CcwSdsRecord[] {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const handle = norm(product.slug);
  const tokens = product.name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 5 && !SDS_STOPWORDS.has(w));
  return library.filter((sds) => {
    const hay = norm(`${sds.documentUrl} ${sds.label ?? ''}`);
    if (handle.length >= 6 && hay.includes(handle)) return true;
    return tokens.some((t) => hay.includes(t));
  });
}

function shopifyToProduct(p: ShopifyProduct, origin: string, scrapedAt: string): CcwProduct {
  const description = htmlToText(p.body_html ?? '').slice(0, 600);
  return {
    slug: p.handle || slugify(p.title),
    name: p.title,
    sourceUrl: `${origin}/products/${p.handle}`,
    brand: p.vendor || null,
    category: p.product_type || null,
    description: description || null,
    imageUrl: p.images?.[0]?.src ?? null,
    price: p.variants?.[0]?.price ?? null,
    tags: Array.isArray(p.tags) ? p.tags : [],
    sds: [],
    scrapedAt,
  };
}

/** Enrich SDS records in place by downloading each PDF via Jina (text + hazards). */
async function enrichSds(library: CcwSdsRecord[], apiKey: string | undefined, cap = 250): Promise<void> {
  let done = 0;
  for (const sds of library.slice(0, cap)) {
    try {
      const doc = await jinaRead(sds.documentUrl, { apiKey, withLinks: false, format: 'text' });
      sds.extractedText = doc.content.slice(0, 20_000);
      sds.hazards = extractHazards(doc.content);
      const dateMatch = doc.content.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
      sds.issuedAt = dateMatch ? dateMatch[1] : null;
      done++;
    } catch (err) {
      console.warn(`  ! SDS fetch failed ${sds.documentUrl}: ${(err as Error).message}`);
    }
  }
  console.log(`  enriched ${done}/${Math.min(library.length, cap)} SDS documents`);
}

// ---------------------------------------------------------------------------
// jina fallback engine (non-Shopify sites): crawl links from the index page.
// ---------------------------------------------------------------------------

function looksLikeProductLink(url: string, baseOrigin: string, productMatch: RegExp | null, sdsMatch: RegExp): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (!/^https?:$/.test(u.protocol)) return false;
  if (u.origin !== baseOrigin) return false;
  if (sdsMatch.test(u.pathname)) return false;
  if (/\.(png|jpe?g|gif|svg|webp|css|js|ico|woff2?|ttf|zip|mp4)($|\?)/i.test(u.pathname)) return false;
  if (productMatch) return productMatch.test(u.pathname + u.search);
  return u.pathname.split('/').filter(Boolean).length >= 1;
}

function extractDescription(markdown: string): string | null {
  const paras = markdown
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && !l.startsWith('![') && !l.startsWith('|') && l.length > 40);
  return paras.length ? paras[0].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').slice(0, 600) : null;
}

function firstImage(images: string[], base: string): string | null {
  for (const img of images) {
    const abs = absoluteUrl(img, base);
    if (abs && /\.(png|jpe?g|webp)($|\?)/i.test(abs)) return abs;
  }
  return images.length ? absoluteUrl(images[0], base) : null;
}

async function scrapeProductViaJina(
  productUrl: string,
  args: Args,
  apiKey: string | undefined,
  scrapedAt: string,
): Promise<CcwProduct | null> {
  let page: JinaReadResult;
  try {
    page = await jinaRead(productUrl, { apiKey, withLinks: true, withImages: true });
  } catch (err) {
    console.warn(`  ! skip ${productUrl}: ${(err as Error).message}`);
    return null;
  }

  const sds: CcwSdsRecord[] = [];
  for (const link of page.links.filter((l: JinaLink) => {
    const abs = absoluteUrl(l.url, productUrl);
    return abs && args.sdsMatch.test(abs);
  })) {
    const documentUrl = absoluteUrl(link.url, productUrl);
    if (!documentUrl) continue;
    sds.push({ documentUrl, label: link.text || null, issuedAt: null, hazards: [], extractedText: null });
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
    price: null,
    tags: [],
    sds,
    scrapedAt,
  };
}

async function crawlViaJina(args: Args, apiKey: string | undefined, scrapedAt: string): Promise<CcwProduct[]> {
  const baseUrl = args.url as string;
  const baseOrigin = new URL(baseUrl).origin;
  const index = await jinaRead(baseUrl, { apiKey, withLinks: true });
  const seen = new Set<string>();
  const candidates: string[] = [];
  for (const link of index.links) {
    const abs = absoluteUrl(link.url, baseUrl);
    if (!abs || !looksLikeProductLink(abs, baseOrigin, args.productMatch, args.sdsMatch)) continue;
    const key = abs.split('#')[0];
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push(key);
  }
  console.log(`Found ${candidates.length} candidate product links; fetching up to ${args.max}.`);

  const products: CcwProduct[] = [];
  for (const url of candidates.slice(0, args.max)) {
    const product = await scrapeProductViaJina(url, args, apiKey, scrapedAt);
    if (product) {
      products.push(product);
      console.log(`  + ${product.name}`);
    }
  }
  return products;
}

// ---------------------------------------------------------------------------

function dedupeSlugs(products: CcwProduct[]): void {
  const used = new Set<string>();
  for (const product of products) {
    const base = product.slug;
    let slug = base;
    for (let i = 2; used.has(slug); i++) slug = `${base}-${i}`;
    used.add(slug);
    product.slug = slug;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.url) {
    console.error(
      'No scrape target. Provide --url <baseUrl> or set CCW_SCRAPE_BASE_URL.\n' +
        'Example: CCW_SCRAPE_BASE_URL="https://ccwonline.com.au/" npm run ccw:scrape:plan',
    );
    process.exit(1);
  }
  const apiKey = process.env.JINA_API_KEY;
  const origin = new URL(args.url).origin;
  const scrapedAt = new Date().toISOString();

  const useShopify =
    args.shopify === 'on' || (args.shopify === 'auto' && (await isShopifyStore(args.url)));

  let engine: string;
  let products: CcwProduct[] = [];
  let sdsLibrary: CcwSdsRecord[] = [];

  if (useShopify) {
    engine = 'shopify';
    console.log(`Shopify store detected at ${origin} — using products.json + SDS page (max ${args.max}).`);
    const shopifyProducts = await fetchShopifyProducts(args.url, { max: args.max });
    console.log(`Fetched ${shopifyProducts.length} products from products.json.`);
    products = shopifyProducts.map((p) => shopifyToProduct(p, origin, scrapedAt));

    sdsLibrary = await fetchSdsLibrary(args.url, args.sdsPage);
    console.log(`Found ${sdsLibrary.length} SDS documents on the Safety Data Sheets page.`);

    if (args.fetchSds && sdsLibrary.length) {
      if (!apiKey) console.warn('JINA_API_KEY not set — SDS text extraction will use Jina anonymously.');
      await enrichSds(sdsLibrary, apiKey);
    }

    let matched = 0;
    for (const product of products) {
      product.sds = matchSdsToProduct(product, sdsLibrary);
      if (product.sds.length) matched++;
    }
    console.log(`Matched SDS to ${matched}/${products.length} products.`);
  } else {
    engine = 'jina';
    if (!apiKey) console.warn('JINA_API_KEY not set — using Jina anonymously (lower rate limit).');
    console.log(`Crawling ${args.url} via Jina (max ${args.max}).`);
    products = await crawlViaJina(args, apiKey, scrapedAt);
  }

  dedupeSlugs(products);
  products.sort((a, b) => a.slug.localeCompare(b.slug));

  const out: CcwProductsCatalogFile = {
    version: CCW_PRODUCTS_CATALOG_VERSION,
    scrapedAt,
    sourceBaseUrl: args.url,
    engine,
    products,
    sdsLibrary,
  };

  const withSds = products.filter((p) => p.sds.length).length;
  console.log(
    `\nResult: ${products.length} products (engine: ${engine}), ` +
      `${sdsLibrary.length} SDS in library, ${withSds} products with a matched SDS.`,
  );

  if (args.plan) {
    console.log('DRY RUN — not writing. Sample product:');
    console.log(JSON.stringify(products[0] ?? null, null, 2).slice(0, 1400));
    return;
  }
  writeFileSync(args.out, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${args.out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
