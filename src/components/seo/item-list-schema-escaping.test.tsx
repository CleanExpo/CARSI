import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ItemListSchema } from './JsonLd';

const HOSTILE_NAME = '</script><script>window.__xss=1</script> & <!-- >';
const HOSTILE_NOTE = 'line\u2028separator\u2029paragraph & </SCRIPT>';

describe('ItemListSchema JSON-LD escaping', () => {
  const html = renderToStaticMarkup(
    createElement(ItemListSchema, {
      name: 'List',
      description: 'desc',
      items: [{ name: HOSTILE_NAME, url: 'https://example.gov.au/a', description: HOSTILE_NOTE }],
    })
  );
  const body = html
    .replace(/^<script type="application\/ld\+json">/, '')
    .replace(/<\/script>$/, '');

  it('cannot break out of its script element', () => {
    expect(html.match(/<script/gi)?.length).toBe(1);
    expect(html.match(/<\/script/gi)?.length).toBe(1);
    expect(body).not.toMatch(/[<>&\u2028\u2029]/);
  });

  it('still parses back to the original strings', () => {
    const parsed = JSON.parse(body) as {
      itemListElement: { item: { name: string; description: string } }[];
    };
    expect(parsed.itemListElement[0].item.name).toBe(HOSTILE_NAME);
    expect(parsed.itemListElement[0].item.description).toBe(HOSTILE_NOTE);
  });
});
