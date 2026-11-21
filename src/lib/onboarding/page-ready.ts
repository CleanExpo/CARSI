/**
 * "The dashboard page has shown its first real view" signal (GP-627).
 *
 * The onboarding wizard is a full-screen modal opened by the (dashboard) layout. Its own check
 * (/api/lms/auth/me) answers faster than the page's data, so the wizard covered a blank page
 * before the learner had seen anything. Pages that load data call `markDashboardPageReady()`
 * once their first view is on screen; the wizard waits for that signal. Pages that never call it
 * are covered by `PAGE_READY_FALLBACK_MS`, so the wizard is delayed, never lost.
 *
 * The flag is module state, so it survives client-side navigation: once the learner has seen a
 * loaded page, later pages do not hold the wizard back again.
 */

export const DASHBOARD_PAGE_READY_EVENT = 'carsi:dashboard-page-ready';

/** Longest the wizard waits for a page that never signals ready. */
export const PAGE_READY_FALLBACK_MS = 6000;

let ready = false;

export function markDashboardPageReady(): void {
  if (ready) return;
  ready = true;
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(DASHBOARD_PAGE_READY_EVENT));
}

export function isDashboardPageReady(): boolean {
  return ready;
}

/** Calls `callback` once the page is ready (immediately if it already is). Returns a cleanup. */
export function onDashboardPageReady(callback: () => void): () => void {
  if (ready) {
    callback();
    return () => undefined;
  }
  if (typeof window === 'undefined') return () => undefined;
  const listener = () => callback();
  window.addEventListener(DASHBOARD_PAGE_READY_EVENT, listener, { once: true });
  return () => window.removeEventListener(DASHBOARD_PAGE_READY_EVENT, listener);
}

/** Test seam only. */
export function resetDashboardPageReadyForTests(): void {
  ready = false;
}
