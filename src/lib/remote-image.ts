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

/** Trim, drop empty; turn protocol-relative URLs into https (common in CDNs / CMS exports). */
export function normalizePublicAssetUrl(url: string | null | undefined): string | null {
  if (url == null) return null;
  const t = url.trim();
  if (!t) return null;
  if (t.startsWith('//')) return `https:${t}`;
  return t;
}
