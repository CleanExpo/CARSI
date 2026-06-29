/**
 * WCAG AA contrast helpers for the per-industry brand accent colors.
 *
 * Industry pages apply a vivid accent color (passed as data, e.g. `#ed9d24`,
 * `#27ae60`, `#6a1b9a`) via inline `style`. On a near-white light surface those
 * bright colors fail AA; on the near-black dark surface a few dark accents (deep
 * purples) fail instead. We can't theme an inline color with a Tailwind variant,
 * so we derive a contrast-safe value per theme and expose both via CSS variables,
 * then switch with a `dark:` class on the consuming element.
 *
 * Reference backgrounds match the marketing surface tokens:
 *   light page/section = #f6f8fb (cards are #ffffff, so #f6f8fb is the safe ref)
 *   dark page/section  = #060a14
 */

type RGB = { r: number; g: number; b: number };

export const LIGHT_SURFACE = '#f6f8fb';
export const DARK_SURFACE = '#060a14';

/** AA: large text (>=24px or >=18.66px bold) needs 3.0; aim slightly above. */
export const LARGE_TEXT_TARGET = 3.2;
/** AA: normal text needs 4.5; aim slightly above. */
export const NORMAL_TEXT_TARGET = 4.6;

function parseHex(hex: string): RGB {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function toHex({ r, g, b }: RGB): string {
  const c = (n: number) =>
    Math.round(Math.max(0, Math.min(255, n)))
      .toString(16)
      .padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

const lin = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const relLum = ({ r, g, b }: RGB) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

function contrast(a: RGB, b: RGB): number {
  const l1 = relLum(a);
  const l2 = relLum(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Returns `hex` unchanged if it already meets `target` against `bg`; otherwise
 * minimally darkens (light bg) or lightens (dark bg) it until the target is met.
 */
export function accentOn(hex: string, bg: string, target: number): string {
  const bgc = parseHex(bg);
  const fg = parseHex(hex);
  if (contrast(fg, bgc) >= target) return hex;

  const darkenTowardBlack = relLum(bgc) > 0.4; // light surface -> darken the accent
  let { r, g, b } = fg;
  for (let i = 0; i < 80 && contrast({ r, g, b }, bgc) < target; i++) {
    if (darkenTowardBlack) {
      r *= 0.92;
      g *= 0.92;
      b *= 0.92;
    } else {
      r += (255 - r) * 0.1;
      g += (255 - g) * 0.1;
      b += (255 - b) * 0.1;
    }
  }
  return toHex({ r, g, b });
}

/**
 * Convenience: derive both theme-safe variants for an accent used as text.
 * `size` selects the AA threshold.
 */
export function accentTextVars(
  hex: string,
  size: 'large' | 'normal' = 'large',
): { light: string; dark: string } {
  const target = size === 'large' ? LARGE_TEXT_TARGET : NORMAL_TEXT_TARGET;
  return {
    light: accentOn(hex, LIGHT_SURFACE, target),
    dark: accentOn(hex, DARK_SURFACE, target),
  };
}
