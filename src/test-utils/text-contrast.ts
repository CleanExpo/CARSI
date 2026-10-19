/**
 * Real WCAG text contrast for server-rendered HTML (test helper; reviews of b5c6ae77 and 5b82bd31).
 *
 * The text colour is the element's (or nearest ancestor's) text-* class, or a bg-clip-text
 * gradient's stops, resolved through Tailwind's own theme.css (oklch → sRGB). The background is
 * the nearest opaque bg-* ancestor, a from-/via-/to- gradient, an alpha bg composited over what is
 * beneath it, or the caller's backdrop colours for text with no background of its own. Every
 * colour/background pair must reach 4.5:1 (3:1 inside an h1, which is large text here).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseFragment } from 'parse5';

const THEME = readFileSync(join(process.cwd(), 'node_modules/tailwindcss/theme.css'), 'utf8');
export type RGB = [number, number, number];

function oklchToRgb(L: number, C: number, h: number): RGB {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return lin.map((c) => {
    const v = Math.min(1, Math.max(0, c));
    return Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055));
  }) as RGB;
}

export const hexRgb = (h: string): RGB => {
  const x = h.length === 4 ? h.replace(/\w/g, (c) => c + c) : h;
  return [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16)) as RGB;
};

/** A Tailwind colour token (`slate-500`, `white`, `[#146fc2]`) as sRGB, or null if unknown. */
export function tokenRgb(token: string): RGB | null {
  if (token === 'white') return [255, 255, 255];
  if (token === 'black') return [0, 0, 0];
  const arb = /^\[(#[0-9a-fA-F]{3,6})\]$/.exec(token);
  if (arb) return hexRgb(arb[1]);
  const m = new RegExp(`--color-${token}:\\s*oklch\\(([\\d.]+)% ([\\d.]+) ([\\d.]+)\\)`).exec(
    THEME
  );
  return m ? oklchToRgb(Number(m[1]) / 100, Number(m[2]), Number(m[3])) : null;
}

const luminance = (rgb: RGB) =>
  rgb
    .map((v) => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    })
    .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);

export function contrast(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const over = (fg: RGB, alpha: number, bg: RGB): RGB =>
  fg.map((c, i) => Math.round(alpha * c + (1 - alpha) * bg[i])) as RGB;

/** Resolved colours of a Tailwind gradient's from-/via-/to- stops on one element. */
const gradientStops = (classes: string[]): RGB[] =>
  classes
    .map((c) => /^(?:from|via|to)-(.+)$/.exec(c))
    .map((m) => m && tokenRgb(m[1]))
    .filter((rgb): rgb is RGB => rgb !== null);

type El = {
  tagName?: string;
  attrs?: { name: string; value: string }[];
  childNodes?: El[];
  value?: string;
};
const classOf = (el: El) => el.attrs?.find((a) => a.name === 'class')?.value.split(/\s+/) ?? [];
const ownText = (el: El) =>
  (el.childNodes ?? [])
    .filter((c) => c.value !== undefined && !c.tagName)
    .map((c) => c.value)
    .join('')
    .trim();
const COLOUR = /^(?:white|black|\[#[0-9a-fA-F]{3,6}\]|[a-z]+-\d{2,3})$/;

/**
 * Every text node under 4.5:1 (3:1 inside an h1) on any background it can sit on.
 * `ignoreBgOfLabel`: an element (by aria-label) whose own bg-* class is covered by an overlay, so
 * the backdrops passed in are what its text really sits on.
 */
export function textContrastFailures(
  html: string,
  backdrops: RGB[],
  { ignoreBgOfLabel }: { ignoreBgOfLabel?: string } = {}
): string[] {
  const failures: string[] = [];
  const walk = (el: El, fg: RGB[] | null, bgs: RGB[], large: boolean) => {
    let colour = fg;
    let backs = bgs;
    const ignoreBg =
      ignoreBgOfLabel !== undefined &&
      el.attrs?.some((a) => a.name === 'aria-label' && a.value === ignoreBgOfLabel);
    for (const c of ignoreBg ? [] : classOf(el)) {
      // base utilities only: hover:, focus:, sm: and similar variants are not the resting colour
      const text = /^text-(.+)$/.exec(c);
      const rgb0 = text && COLOUR.test(text[1]) ? tokenRgb(text[1]) : null;
      if (rgb0) colour = [rgb0];
      const bg =
        /^bg-(white|black|\[#[0-9a-fA-F]{3,6}\]|[a-z]+-\d{2,3})(?:\/(\d+|\[[\d.]+\]))?$/.exec(c);
      const rgb = bg && tokenRgb(bg[1]);
      if (rgb) {
        const alpha = bg[2]
          ? Number(bg[2].replace(/[[\]]/g, '')) / (bg[2].startsWith('[') ? 1 : 100)
          : 1;
        backs = alpha >= 1 ? [rgb] : backs.map((b) => over(rgb, alpha, b));
      }
    }
    // a Tailwind gradient: clipped to the text it IS the text colour; otherwise a background
    const classes = classOf(el);
    if (classes.some((c) => /^bg-(?:gradient|linear)-to-/.test(c))) {
      const stops = gradientStops(classes);
      if (stops.length && classes.includes('bg-clip-text')) colour = stops;
      else if (stops.length) backs = stops;
    }
    const text = ownText(el);
    const isLarge = large || el.tagName === 'h1';
    if (text && el.tagName !== 'svg' && colour) {
      const worst = Math.min(...colour.flatMap((c) => backs.map((b) => contrast(c, b))));
      if (worst < (isLarge ? 3 : 4.5))
        failures.push(`<${el.tagName}> "${text.slice(0, 40)}" ${worst.toFixed(2)}:1`);
    }
    if (el.tagName !== 'svg')
      for (const child of el.childNodes ?? []) walk(child, colour, backs, isLarge);
  };
  walk(parseFragment(html) as unknown as El, null, backdrops, false);
  return failures;
}
