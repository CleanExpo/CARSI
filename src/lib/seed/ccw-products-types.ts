/**
 * JSON shape for `data/seed/ccw-products.json`.
 * Produced by `scripts/scrape-ccw-products.ts` and consumed by downstream
 * seed/enrichment steps. Holds CCW product records and their Safety Data Sheets (SDS).
 */
export const CCW_PRODUCTS_CATALOG_VERSION = 2 as const;

export type CcwSdsRecord = {
  /** Canonical URL of the SDS document (usually a PDF). */
  documentUrl: string;
  /** Human label for the SDS link as found on the source page, when available. */
  label: string | null;
  /** Issue / revision date as printed on the SDS, ISO-8601 when parseable, else raw string. */
  issuedAt: string | null;
  /** GHS hazard statements / signal words extracted from the SDS text, when available. */
  hazards: string[];
  /** Raw extracted SDS text (Jina markdown). Null when the SDS was not fetched. */
  extractedText: string | null;
};

export type CcwProduct = {
  /** Stable slug derived from the product handle or name. Unique within the file. */
  slug: string;
  name: string;
  /** Source product page URL. */
  sourceUrl: string;
  brand: string | null;
  category: string | null;
  description: string | null;
  imageUrl: string | null;
  /** Price as a plain decimal string (store currency), when known. */
  price: string | null;
  /** Product tags from the source store, when available. */
  tags: string[];
  /** SDS documents matched to this product (0..n). */
  sds: CcwSdsRecord[];
  /** ISO-8601 timestamp this record was scraped. */
  scrapedAt: string;
};

export type CcwProductsCatalogFile = {
  version: typeof CCW_PRODUCTS_CATALOG_VERSION;
  /** ISO-8601 timestamp of the scrape run that produced this file. */
  scrapedAt: string;
  /** Base/catalog URL the scrape started from. */
  sourceBaseUrl: string;
  /** Engine used to fetch products, e.g. "shopify" or "jina". */
  engine: string;
  products: CcwProduct[];
  /**
   * All SDS documents discovered on the site's Safety Data Sheets page, whether or
   * not they were matched to a product. Lets nothing be lost when matching is imperfect.
   */
  sdsLibrary: CcwSdsRecord[];
};

export function isCcwProductsCatalogFile(value: unknown): value is CcwProductsCatalogFile {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.version === CCW_PRODUCTS_CATALOG_VERSION &&
    typeof v.scrapedAt === 'string' &&
    typeof v.sourceBaseUrl === 'string' &&
    typeof v.engine === 'string' &&
    Array.isArray(v.products) &&
    Array.isArray(v.sdsLibrary)
  );
}
