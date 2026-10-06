import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PublicFooter } from './PublicFooter';

/**
 * The public footer carries the cross-sell to RestoreAssist, CARSI's sister
 * product. Two things are easy to get wrong and invisible once shipped.
 *
 * First, the footer renders in two tones and they are separate JSX trees, not
 * one component with a prop. A link added to `chrome` alone is simply absent
 * on every page that uses `light`, and nothing else in the suite notices.
 *
 * Second, the explainer link has to land on the product-overview video rather
 * than the top of the RestoreAssist marketing home. That depends on the
 * `#overview` fragment surviving; drop it and the link still returns 200, so
 * only an assertion on the href catches it.
 *
 * External targets are also pinned to noopener/noreferrer here: a
 * target="_blank" without them hands the opened page a live window.opener
 * reference back into carsi.com.au.
 */

const RESTOREASSIST_HOME = 'https://restoreassist.app';
const RESTOREASSIST_EXPLAINER = 'https://restoreassist.app/#overview';

// Same per-tone shape as src/lib/marketing/legal-pages.test.tsx, which records
// that an independent review once deleted the light strip's two links while
// that suite still passed. Every current caller passes tone="light"
// (app/page.tsx, app/(public)/layout.tsx), so a test that renders only the
// default would prove nothing about the footer anyone actually sees.
const TONES = ['chrome', 'light'] as const;

describe('PublicFooter — RestoreAssist cross-sell', () => {
  it.each(TONES)('the %s footer links to RestoreAssist', (tone) => {
    const html = renderToStaticMarkup(<PublicFooter tone={tone} />);
    expect(html).toContain(`href="${RESTOREASSIST_HOME}"`);
  });

  it.each(TONES)(
    'the %s footer links straight to the explainer video, not the page top',
    (tone) => {
      const html = renderToStaticMarkup(<PublicFooter tone={tone} />);
      expect(html).toContain(`href="${RESTOREASSIST_EXPLAINER}"`);
    }
  );

  it.each(TONES)('the %s footer labels the explainer link in words, not icon-only', (tone) => {
    const html = renderToStaticMarkup(<PublicFooter tone={tone} />);
    expect(html).toContain('Explainer videos');
  });

  it.each(TONES)('the %s footer opens both RestoreAssist links in a new tab, safely', (tone) => {
    const html = renderToStaticMarkup(<PublicFooter tone={tone} />);
    // Every anchor pointing at restoreassist.app must carry both tokens: a bare
    // target="_blank" hands the opened page a live window.opener back into
    // carsi.com.au.
    const anchors = html.match(/<a\b[^>]*href="https:\/\/restoreassist\.app[^"]*"[^>]*>/g) ?? [];
    expect(anchors.length).toBeGreaterThanOrEqual(2);
    for (const anchor of anchors) {
      expect(anchor).toContain('target="_blank"');
      expect(anchor).toContain('rel="noopener noreferrer"');
    }
  });
});
