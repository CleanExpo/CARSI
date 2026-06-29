import { getPublicSiteUrl } from '@/lib/env/public-url';

/**
 * Default Open Graph / Twitter share image for CARSI.
 *
 * Next.js metadata merging REPLACES the entire `openGraph` object when a child
 * route segment defines its own `openGraph` — it does not deep-merge images
 * (see nextjs.org/docs/.../generate-metadata#merging). So any page that sets its
 * own `openGraph` without `images` silently loses the root layout's share image
 * and renders zero `og:image` tags. Spread `OG_IMAGES` into those pages' (and
 * `twitter`) blocks so every shareable page keeps a valid fallback image.
 */
const siteUrl = getPublicSiteUrl();

export const OG_IMAGES = [
  {
    url: `${siteUrl}/og-image.png`,
    width: 1200,
    height: 630,
    alt: 'CARSI — Professional Restoration Training',
  },
];

/** Twitter accepts a flat list of URLs. */
export const OG_IMAGE_URLS = OG_IMAGES.map((image) => image.url);
