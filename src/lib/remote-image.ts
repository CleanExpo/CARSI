/**
 * Next.js `/_next/image` fetches remote URLs on the server; slow CDNs (or flaky networks)
 * often hit the optimizer timeout → 500 + `TimeoutError`. For those hosts, load the URL
 * directly in the browser (`unoptimized` on `next/image`).
 */
export function bypassNextImageOptimizer(src: string): boolean {
  const s = normalizePublicAssetUrl(src);
  if (!s) return false;
  const lower = s.toLowerCase();
  // Cloudinary: avoid slow/flaky server-side optimizer fetches.
  if (
    lower.startsWith('https://res.cloudinary.com/') ||
    lower.startsWith('http://res.cloudinary.com/')
  ) {
    return true;
  }
  // Any other remote URL: catalogue thumbs often come from CDNs not listed in `images.remotePatterns`,
  // or the optimizer times out — load the URL directly in the browser instead.
  if (lower.startsWith('https://') || lower.startsWith('http://')) return true;
  return false;
}

/**
 * Ask Cloudinary to deliver a sized, modern-format image instead of the raw upload.
 *
 * Cloudinary URLs bypass the Next optimizer (see above), so whatever was uploaded is what the
 * browser downloads. Nothing in the codebase asked for a transformation — `grep -rn "f_auto"`
 * matched nothing — so the course catalogue shipped its originals. Measured on production
 * 2026-08-18: `/courses` served 22 thumbnails totalling 48,486,199 bytes (46.2 MiB), each PNG
 * between 1.77 MB and 2.57 MB, rendered into cards a few hundred pixels wide. On a 1.6 Mbps
 * connection that is roughly four minutes of images for the page that sells the product.
 *
 * `f_auto` picks WebP/AVIF per browser, `q_auto` picks a quality, `c_limit` scales down to the
 * requested width but never up, so a small original is never blown up. Measured on the first
 * catalogue thumbnail: 1,916,632 B → 9,428 B at w_400, a 99.6% reduction.
 *
 * Idempotent, and a no-op for any host that is not Cloudinary.
 */
export function cloudinaryDeliveryUrl(url: string, width: number): string {
  const marker = '/image/upload/';
  const idx = url.indexOf(marker);
  if (idx === -1) return url;
  if (!/^https?:\/\/res\.cloudinary\.com\//i.test(url)) return url;

  const rest = url.slice(idx + marker.length);
  // Already transformed (by us or by hand) — leave it alone rather than stacking segments.
  if (/(^|\/)(f_auto|q_auto|c_limit|w_\d+)/.test(rest.split('/')[0] ?? '')) return url;

  const safeWidth = Number.isFinite(width) && width > 0 ? Math.round(width) : 800;
  return `${url.slice(0, idx + marker.length)}f_auto,q_auto,c_limit,w_${safeWidth}/${rest}`;
}

/** Trim, drop empty; turn protocol-relative URLs into https (common in CDNs / CMS exports). */
export function normalizePublicAssetUrl(url: string | null | undefined): string | null {
  if (url == null) return null;
  const t = url.trim();
  if (!t) return null;
  if (t.startsWith('//')) return `https:${t}`;
  return t;
}

/**
 * For `<img>` / `next/image` `src`: normalize then ensure app-relative paths use a leading `/`
 * so they resolve from the site root (not from `/admin/courses/...`).
 */
export function normalizeImageSrcForApp(url: string | null | undefined): string | null {
  const n = normalizePublicAssetUrl(url);
  if (!n) return null;
  if (n.startsWith('http://') || n.startsWith('https://')) return n;
  return n.startsWith('/') ? n : `/${n}`;
}
