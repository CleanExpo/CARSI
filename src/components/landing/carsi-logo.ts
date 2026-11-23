/**
 * The approved CARSI wordmarks. This is the single owner: PublicLogo renders these and the
 * live smoke (e2e/live-smoke.live.ts) accepts only these. Never copy a path elsewhere.
 *
 * `light` is the navy-lettered wordmark for light backgrounds. `chrome` is the reversed
 * white-lettered wordmark for the dark navy bands (auth card, dark nav and footer), the same
 * official asset the transactional emails use (#1288, GP-779).
 */
export const CARSI_LOGO_SRC = {
  light: '/logo/logo1.png',
  chrome: '/logo/dark-logo.png',
} as const;

export const APPROVED_CARSI_LOGO_PATHS: readonly string[] = Object.values(CARSI_LOGO_SRC);

/**
 * True only when an image URL (as the browser reports it in img.currentSrc) is one of the
 * approved wordmarks, served directly or through next/image (`/_next/image?url=...`).
 * The file path must match exactly; a URL that only contains an approved path (in a longer
 * name or in its query string) is rejected.
 */
export function isApprovedCarsiLogoSrc(src: string): boolean {
  let url: URL;
  try {
    url = new URL(src, 'https://carsi.invalid');
  } catch {
    return false;
  }
  let file = url.pathname;
  if (file === '/_next/image') {
    const inner = url.searchParams.get('url');
    if (!inner) return false;
    try {
      file = new URL(inner, 'https://carsi.invalid').pathname;
    } catch {
      return false;
    }
  }
  return APPROVED_CARSI_LOGO_PATHS.includes(file);
}
