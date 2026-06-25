/**
 * Minimal client for a Shopify storefront's public product feed.
 *
 * Most Shopify stores expose `/products.json` (and `/collections/<handle>/products.json`)
 * with no auth — a clean, structured list of real products (title, vendor, type, tags,
 * images, variants/prices, body_html). That is far more reliable than crawling HTML pages,
 * so the CCW scraper prefers it when the target store is Shopify.
 */

const USER_AGENT = 'Mozilla/5.0 (compatible; CARSI-CCW-Scraper/1.0)';

export type ShopifyImage = { src: string };
export type ShopifyVariant = { price: string };

export type ShopifyProduct = {
  id: number;
  title: string;
  handle: string;
  body_html: string;
  vendor: string;
  product_type: string;
  tags: string[];
  images: ShopifyImage[];
  variants: ShopifyVariant[];
  published_at: string | null;
};

function withTimeout(ms: number): { signal: AbortSignal; done: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}

/** Returns true if the base URL's origin serves a Shopify-style `/products.json`. */
export async function isShopifyStore(baseUrl: string, timeoutMs = 15_000): Promise<boolean> {
  const origin = new URL(baseUrl).origin;
  const { signal, done } = withTimeout(timeoutMs);
  try {
    const res = await fetch(`${origin}/products.json?limit=1`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal,
    });
    if (!res.ok) return false;
    if (!(res.headers.get('content-type') ?? '').includes('json')) return false;
    const json = (await res.json()) as { products?: unknown };
    return Array.isArray(json.products);
  } catch {
    return false;
  } finally {
    done();
  }
}

/**
 * Fetch products from `/products.json`, paginating until exhausted or `max` is reached.
 * Shopify caps page size at 250.
 */
export async function fetchShopifyProducts(
  baseUrl: string,
  opts: { max?: number; timeoutMs?: number } = {},
): Promise<ShopifyProduct[]> {
  const { max = Number.POSITIVE_INFINITY, timeoutMs = 45_000 } = opts;
  const origin = new URL(baseUrl).origin;
  const out: ShopifyProduct[] = [];

  for (let page = 1; page <= 50 && out.length < max; page++) {
    const { signal, done } = withTimeout(timeoutMs);
    let batch: ShopifyProduct[] = [];
    try {
      const res = await fetch(`${origin}/products.json?limit=250&page=${page}`, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal,
      });
      if (!res.ok) break;
      const json = (await res.json()) as { products?: ShopifyProduct[] };
      batch = Array.isArray(json.products) ? json.products : [];
    } catch {
      break;
    } finally {
      done();
    }
    if (batch.length === 0) break;
    out.push(...batch);
    if (batch.length < 250) break; // last page
  }

  return out.slice(0, max === Number.POSITIVE_INFINITY ? out.length : max);
}
