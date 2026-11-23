import { safePathname } from '@/lib/analytics/consent';

/** Same-origin route form only — never sends query strings or external hosts. */
export function carsiLinkPathFromAnchor(anchor: HTMLAnchorElement, origin = window.location.origin): string | undefined {
  try {
    const url = new URL(anchor.href);
    if (url.origin !== origin) return undefined;
    const path = safePathname(url.pathname);
    return path || undefined;
  } catch {
    return undefined;
  }
}