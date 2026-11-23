/**
 * Resolve the nearest element carrying `data-carsi-event` from an event target.
 */
export function resolveCarsiDataEventTarget(
  target: EventTarget | null
): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const el = target.closest('[data-carsi-event]');
  return el instanceof HTMLElement ? el : null;
}