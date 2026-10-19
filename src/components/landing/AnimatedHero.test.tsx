import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { AnimatedHero } from './AnimatedHero';

const VOID_TAGS = new Set(['br', 'hr', 'img', 'input', 'link', 'meta', 'path', 'source', 'wbr']);
const HIDDEN = /opacity:\s*0(?![.\d])/;

// Is any element on the path from the root to the text hidden at opacity 0?
function hiddenAt(html: string, text: string): boolean {
  const stack: boolean[] = [];
  const tokens = html.matchAll(/<(\/?)([a-z0-9]+)([^>]*?)(\/?)>|([^<]+)/gi);
  for (const [, closing, tag, attrs, selfClosing, data] of tokens) {
    if (data !== undefined) {
      if (data.includes(text)) return stack.some(Boolean);
    } else if (closing) {
      stack.pop();
    } else if (!selfClosing && !VOID_TAGS.has(tag.toLowerCase())) {
      stack.push(HIDDEN.test(/style="([^"]*)"/.exec(attrs)?.[1] ?? ''));
    }
  }
  throw new Error(`"${text}" not found in the rendered hero`);
}

describe('AnimatedHero', () => {
  // The subtitle is the mobile LCP element; hidden until hydration it put LCP at 26 s.
  it('server-renders the headline and subtitle visible, not waiting on hydration', () => {
    const html = renderToStaticMarkup(createElement(AnimatedHero, { benefits: [] }));
    expect(hiddenAt(html, 'Become')).toBe(false);
    expect(hiddenAt(html, 'trusts.')).toBe(false);
    expect(hiddenAt(html, 'trains Australia')).toBe(false);
  });
});
