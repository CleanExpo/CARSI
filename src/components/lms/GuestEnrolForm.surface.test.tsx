import { parseFragment, type DefaultTreeAdapterMap } from 'parse5';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { GuestEnrolForm } from './GuestEnrolForm';
import { CoursePurchaseOptions } from './CoursePurchaseOptions';

function luminance(hex: string): number {
  const channels = hex.match(/[a-f\d]{2}/gi)!.map((channel) => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(a: string, b: string): number {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

/** Read the explicit Tailwind colours from the actual rendered elements, including inheritance. */
function checkContrast(html: string, background: string): void {
  let textCount = 0;
  let inputCount = 0;
  function walk(node: DefaultTreeAdapterMap['node'], bg: string, fg?: string) {
    if (node.nodeName === '#text') {
      if ('value' in node && node.value.trim()) {
        expect(fg, node.value).toBeDefined();
        expect(contrast(fg!, bg), node.value).toBeGreaterThanOrEqual(4.5);
        textCount++;
      }
      return;
    }
    const element = node as DefaultTreeAdapterMap['element'];
    const classes = element.attrs?.find((attr) => attr.name === 'class')?.value ?? '';
    const colour = (prefix: string) =>
      classes.match(new RegExp(`(?:^| )${prefix}-\\[(#[a-f\\d]{6})\\](?: |$)`, 'i'))?.[1];
    const nextBg = colour('bg') ?? bg;
    const nextFg = colour('text') ?? fg;
    // Every form label/help/link must use an opaque surface colour, not a white alpha token.
    expect(classes).not.toMatch(/(?:text|border|bg)-white(?:\/|\b)/);
    if (element.tagName === 'input' && element.attrs.some((a) => a.name === 'id')) {
      for (const prefix of ['text', 'placeholder:text', 'border', 'focus-visible:ring']) {
        const value = colour(prefix);
        expect(value, prefix).toBeDefined();
        expect(contrast(value!, nextBg), prefix).toBeGreaterThanOrEqual(
          prefix.includes('text') ? 4.5 : 3
        );
      }
      inputCount++;
    }
    if ('childNodes' in node) node.childNodes.forEach((child) => walk(child, nextBg, nextFg));
  }
  walk(parseFragment(html), background);
  expect(textCount).toBeGreaterThan(0);
  expect(inputCount).toBeGreaterThan(0);
}

describe('course enrol surface contrast (#859)', () => {
  for (const surface of [undefined, 'light', 'dark'] as const) {
    const background = surface === 'dark' ? '#111827' : '#ffffff';
    it.each([true, false])(
      `${surface ?? 'default light'}: free=%s labels, help, links and inputs meet AA`,
      (isFree) => {
        const html = renderToStaticMarkup(
          <GuestEnrolForm
            slug="water-damage-essentials"
            priceAud={isFree ? 0 : 29}
            isFree={isFree}
            showTeamOption
            surface={surface}
          />
        );
        expect(html).toContain(`bg-[${background}]`);
        expect(html).toContain(`[color-scheme:${surface ?? 'light'}]`);
        checkContrast(html, background);
      }
    );

    it(`${surface ?? 'default light'}: team seat input and total meet AA`, () => {
      const html = renderToStaticMarkup(
        <CoursePurchaseOptions
          mode="team"
          onModeChange={() => {}}
          teamSeats={3}
          onTeamSeatsChange={() => {}}
          unitPriceAud={29}
          surface={surface}
        />
      );
      expect(html).toContain(`bg-[${background}]`);
      expect(html).toContain('id="team-seat-count"');
      checkContrast(html, background);
    });
  }

  it('rejects the original white-on-white labels', () => {
    expect(() => checkContrast('<label class="text-white/70">Email</label>', '#ffffff')).toThrow();
  });
});
