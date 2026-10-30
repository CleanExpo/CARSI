/**
 * First-touch attribution capture (Authority Machine slice 1a) — feature flag.
 *
 * DARK by default. Only `ATTRIBUTION_CAPTURE_ENABLED=true` or `=1` turns it on; anything else,
 * including unset, is off. When off, no `carsi_ft` cookie is written and checkout metadata is
 * exactly what it was before slice 1a.
 *
 * Read at request time (proxy and checkout route), never while rendering a prerendered page,
 * so flipping it needs no rebuild. Server-only: never import into client code.
 */
export function isAttributionCaptureEnabled(): boolean {
  const value = process.env.ATTRIBUTION_CAPTURE_ENABLED?.trim().toLowerCase();
  return value === 'true' || value === '1';
}
