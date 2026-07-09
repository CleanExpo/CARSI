import { describe, expect, it } from 'vitest';

import {
  KEEP_ONSCREEN_PX,
  MARGOT_POSITION_STORAGE_KEY,
  clampOffsetToViewport,
  clampRectShift,
  parseStoredPosition,
  serializePosition,
} from './margot-position';

describe('MARGOT_POSITION_STORAGE_KEY', () => {
  it('is the agreed localStorage key', () => {
    expect(MARGOT_POSITION_STORAGE_KEY).toBe('carsi-margot-position');
  });
});

describe('parseStoredPosition', () => {
  it('parses a valid persisted position', () => {
    expect(parseStoredPosition('{"x":-120,"y":-340}')).toEqual({ x: -120, y: -340 });
  });

  it('accepts zero offsets', () => {
    expect(parseStoredPosition('{"x":0,"y":0}')).toEqual({ x: 0, y: 0 });
  });

  it('returns null for null/undefined/empty input', () => {
    expect(parseStoredPosition(null)).toBeNull();
    expect(parseStoredPosition(undefined)).toBeNull();
    expect(parseStoredPosition('')).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    expect(parseStoredPosition('{x:-1')).toBeNull();
    expect(parseStoredPosition('not json')).toBeNull();
  });

  it('returns null for non-object JSON', () => {
    expect(parseStoredPosition('42')).toBeNull();
    expect(parseStoredPosition('"x"')).toBeNull();
    expect(parseStoredPosition('null')).toBeNull();
  });

  it('returns null when x or y is missing or not a number', () => {
    expect(parseStoredPosition('{"x":-10}')).toBeNull();
    expect(parseStoredPosition('{"y":-10}')).toBeNull();
    expect(parseStoredPosition('{"x":"-10","y":-10}')).toBeNull();
    expect(parseStoredPosition('{"x":-10,"y":true}')).toBeNull();
  });

  it('returns null for non-finite numbers', () => {
    expect(parseStoredPosition('{"x":-10,"y":1e999}')).toBeNull();
  });
});

describe('serializePosition', () => {
  it('round-trips through parseStoredPosition', () => {
    const raw = serializePosition({ x: -120, y: -340 });
    expect(parseStoredPosition(raw)).toEqual({ x: -120, y: -340 });
  });

  it('rounds fractional drag offsets', () => {
    expect(serializePosition({ x: -120.6, y: -10.4 })).toBe('{"x":-121,"y":-10}');
    expect(parseStoredPosition(serializePosition({ x: -120.6, y: -10.4 }))).toEqual({
      x: -121,
      y: -10,
    });
  });
});

describe('clampOffsetToViewport', () => {
  const VW = 1440;
  const VH = 900;

  it('leaves an in-viewport offset unchanged', () => {
    expect(clampOffsetToViewport({ x: -300, y: -200 }, VW, VH)).toEqual({ x: -300, y: -200 });
  });

  it('clamps positive offsets back to the default corner (never past bottom-right)', () => {
    expect(clampOffsetToViewport({ x: 50, y: 999 }, VW, VH)).toEqual({ x: 0, y: 0 });
  });

  it('clamps a stale offset from a larger monitor so the widget stays reachable', () => {
    // e.g. saved at x=-2400 on an ultrawide, restored on a 1440px screen
    const clamped = clampOffsetToViewport({ x: -2400, y: -1600 }, VW, VH);
    expect(clamped).toEqual({ x: -(VW - KEEP_ONSCREEN_PX), y: -(VH - KEEP_ONSCREEN_PX) });
  });

  it('keeps exactly the boundary offset', () => {
    const minX = -(VW - KEEP_ONSCREEN_PX);
    expect(clampOffsetToViewport({ x: minX, y: 0 }, VW, VH)).toEqual({ x: minX, y: 0 });
  });

  it('never produces a positive minimum on tiny viewports', () => {
    expect(clampOffsetToViewport({ x: -500, y: -500 }, 40, 40)).toEqual({ x: 0, y: 0 });
  });
});

describe('clampRectShift', () => {
  const VW = 1440;
  const VH = 900;

  it('returns the offset unchanged when the rect already fits', () => {
    const rect = { top: 100, left: 100, right: 520, bottom: 660 };
    expect(clampRectShift({ x: -300, y: -200 }, rect, VW, VH)).toEqual({ x: -300, y: -200 });
  });

  it('shifts right when the rect hangs off the left edge', () => {
    const rect = { top: 100, left: -60, right: 360, bottom: 660 };
    expect(clampRectShift({ x: -900, y: -200 }, rect, VW, VH)).toEqual({ x: -840, y: -200 });
  });

  it('shifts down when the rect hangs off the top edge (launcher dragged up, then chat opened)', () => {
    const rect = { top: -120, left: 200, right: 620, bottom: 440 };
    expect(clampRectShift({ x: -700, y: -640 }, rect, VW, VH)).toEqual({ x: -700, y: -520 });
  });

  it('shifts left/up when the rect overflows right/bottom', () => {
    const rect = { top: 500, left: 1200, right: 1500, bottom: 950 };
    expect(clampRectShift({ x: 0, y: 0 }, rect, VW, VH)).toEqual({ x: -60, y: -50 });
  });

  it('prefers keeping the top-left (header/handle) visible when the rect is larger than the viewport', () => {
    const rect = { top: -50, left: -20, right: 500, bottom: 1000 };
    const small = clampRectShift({ x: 0, y: 0 }, rect, 400, 800);
    // left edge pinned to 0, top edge pinned to 0
    expect(small).toEqual({ x: 20, y: 50 });
  });

  it('respects an explicit margin', () => {
    const rect = { top: 4, left: 4, right: 300, bottom: 300 };
    expect(clampRectShift({ x: -100, y: -100 }, rect, VW, VH, 12)).toEqual({ x: -92, y: -92 });
  });
});
