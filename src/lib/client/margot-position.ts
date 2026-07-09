/**
 * Margot floating chat — draggable-position helpers (GP-500).
 *
 * Pure and DOM-free so they can be unit-tested in the repo's node (no-jsdom)
 * vitest environment.
 *
 * Coordinate model: `{ x, y }` are CSS translate offsets in px from the
 * widget's default bottom-right anchor. `{ x: 0, y: 0 }` is the default
 * corner; negative x moves the widget left, negative y moves it up.
 */

export interface MargotPosition {
  x: number;
  y: number;
}

export interface RectLike {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

export const MARGOT_POSITION_STORAGE_KEY = 'carsi-margot-position';

/** Minimum px of the widget that must remain reachable inside the viewport. */
export const KEEP_ONSCREEN_PX = 72;

/**
 * Parse a persisted position. Returns null for anything malformed (bad JSON,
 * missing keys, non-finite numbers) so a corrupt localStorage entry can never
 * poison the widget's placement.
 */
export function parseStoredPosition(raw: string | null | undefined): MargotPosition | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { x, y } = parsed as { x?: unknown; y?: unknown };
    if (typeof x !== 'number' || typeof y !== 'number') return null;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
  } catch {
    return null;
  }
}

export function serializePosition(pos: MargotPosition): string {
  return JSON.stringify({ x: Math.round(pos.x), y: Math.round(pos.y) });
}

/**
 * Clamp a stored/derived offset to the current viewport without needing the
 * widget's rendered size. Because the widget is anchored bottom-right, valid
 * offsets are always <= 0 on both axes, and an offset further than
 * `-(viewport - KEEP_ONSCREEN_PX)` would leave the widget unreachable
 * off the top/left edge.
 */
export function clampOffsetToViewport(
  pos: MargotPosition,
  viewportWidth: number,
  viewportHeight: number
): MargotPosition {
  const minX = Math.min(0, KEEP_ONSCREEN_PX - viewportWidth);
  const minY = Math.min(0, KEEP_ONSCREEN_PX - viewportHeight);
  return {
    x: Math.min(0, Math.max(minX, pos.x)),
    y: Math.min(0, Math.max(minY, pos.y)),
  };
}

/**
 * Given the widget's current bounding rect (already rendered at offset `pos`)
 * and the viewport, return the adjusted offset that shifts the whole rect
 * back inside the viewport. If the rect is larger than the viewport, the
 * top/left edges win so the header/handle stays reachable.
 */
export function clampRectShift(
  pos: MargotPosition,
  rect: RectLike,
  viewportWidth: number,
  viewportHeight: number,
  margin = 0
): MargotPosition {
  let dx = 0;
  let dy = 0;
  if (rect.right > viewportWidth - margin) dx = viewportWidth - margin - rect.right;
  if (rect.left + dx < margin) dx = margin - rect.left;
  if (rect.bottom > viewportHeight - margin) dy = viewportHeight - margin - rect.bottom;
  if (rect.top + dy < margin) dy = margin - rect.top;
  return { x: pos.x + dx, y: pos.y + dy };
}
