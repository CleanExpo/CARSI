/**
 * Scroll helpers for the lesson player (GP-627).
 *
 * The dashboard layout scrolls inside `<main>`, not the window, so a lesson that replaces the
 * previous one in place keeps the previous lesson's scroll offset. After "Mark complete" that
 * left the next lesson open at the bottom. These helpers find the element that actually scrolls
 * and move it, falling back to the window when nothing inside the page scrolls.
 */

/** The nearest ancestor that scrolls vertically, or null when the page (window) scrolls. */
export function findScrollRoot(element: HTMLElement): HTMLElement | null {
  const doc = element.ownerDocument;
  let scrollRoot = element.parentElement;
  while (scrollRoot && scrollRoot !== doc.body && scrollRoot !== doc.documentElement) {
    if (
      /^(auto|scroll|overlay)$/.test(window.getComputedStyle(scrollRoot).overflowY) &&
      scrollRoot.clientHeight > 0
    )
      break;
    scrollRoot = scrollRoot.parentElement;
  }
  if (scrollRoot === doc.body || scrollRoot === doc.documentElement) return null;
  return scrollRoot;
}

/**
 * Open a lesson at its top. The jump is instant, never smooth: it is a page change, not an
 * animation, so it needs no prefers-reduced-motion branch.
 */
export function scrollLessonToTop(element: HTMLElement | null | undefined): void {
  if (!element) return;
  const target = findScrollRoot(element) ?? window;
  target.scrollTo({ top: 0, behavior: 'instant' });
}
