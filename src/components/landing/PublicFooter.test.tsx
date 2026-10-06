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

describe('PublicFooter — RestoreAssist cross-sell', () => {
  for (const tone of ['chrome', 'light'] as const) {
    describe(`${tone} tone`, () => {
      const html = renderToStaticMarkup(<PublicFooter tone={tone} />);

      it('links to RestoreAssist', () => {
        expect(html).toContain(`href="${RESTOREASSIST_HOME}"`);
      });

      it('links straight to the explainer video, not the page top', () => {
        expect(html).toContain(`href="${RESTOREASSIST_EXPLAINER}"`);
      });

      it('labels the explainer link in words, not icon-only', () => {
        expect(html).toContain('Explainer videos');
      });

      it('opens both RestoreAssist links in a new tab, safely', () => {
        // Every anchor pointing at restoreassist.app must carry both tokens.
        const anchors =
          html.match(/<a\b[^>]*href="https:\/\/restoreassist\.app[^"]*"[^>]*>/g) ?? [];
        expect(anchors.length).toBeGreaterThanOrEqual(2);
        for (const anchor of anchors) {
          expect(anchor).toContain('target="_blank"');
          expect(anchor).toContain('rel="noopener noreferrer"');
        }
      });
    });
  }
});
