/**
 * Next 16 streams page metadata (<title>, description, canonical) into <body> for user agents
 * outside its "HTML-limited bot" list, and renders it blocking in <head> for agents on that list.
 *
 * Round 1 set `htmlLimitedBots: /.*\/` so every agent got in-<head> metadata. Review on
 * 18/10/2026 (P1-ALL-UA-METADATA-PERFORMANCE-UNPROVEN): that makes every browser wait for
 * dynamic metadata (the /courses catalogue read, each course read) before any HTML is sent.
 * Review of 7a2d510c (finding 1): Next's default list leaves out ordinary Googlebot, so its
 * metadata streamed after <head>. The setting is now Next's default list plus Googlebot only.
 * These tests pin that through Next's own decision function.
 */
import { describe, expect, it } from 'vitest';
import { shouldServeStreamingMetadata } from 'next/dist/server/lib/streaming-metadata';
import { HTML_LIMITED_BOT_UA_RE_STRING } from 'next/dist/shared/lib/router/utils/is-bot';

import nextConfig from '../../../next.config';

const GOOGLEBOT = {
  googlebotDesktop: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  googlebotSmartphone:
    'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.7390.122 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
};
/** On Next's default list: they must keep blocking metadata. */
const DEFAULT_BOTS = {
  bingbot: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
  googleInspectionTool:
    'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36 (compatible; Google-InspectionTool/1.0;)',
  chromeLighthouse:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Chrome-Lighthouse',
  linkedInBot:
    'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)',
};
const BROWSERS = {
  iPhoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  desktopChrome:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
  googleAppIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/380.0.0 Mobile/15E148 Safari/604.1',
};

/** What Next uses: it keeps the configured RegExp's source (next/dist/server/config.js). */
function effectivePattern(): string {
  const value = (nextConfig as { htmlLimitedBots?: RegExp }).htmlLimitedBots;
  return value instanceof RegExp ? value.source : HTML_LIMITED_BOT_UA_RE_STRING;
}
const streams = (ua: string, pattern = effectivePattern()) =>
  shouldServeStreamingMetadata(ua, pattern);

describe('page metadata: Next default bot list plus Googlebot', () => {
  it('metadata: htmlLimitedBots is exactly the Next default list plus Googlebot', () => {
    const value = (nextConfig as { htmlLimitedBots?: unknown }).htmlLimitedBots;
    expect(value).toBeInstanceOf(RegExp);
    expect((value as RegExp).source).toBe(`${HTML_LIMITED_BOT_UA_RE_STRING}|\\bGooglebot\\b`);
  });

  it.each(Object.entries(GOOGLEBOT))('metadata: %s gets blocking (in-head) metadata', (_n, ua) => {
    expect(streams(ua)).toBe(false);
  });

  it('metadata: Googlebot would stream under the default list alone (control)', () => {
    expect(streams(GOOGLEBOT.googlebotDesktop, HTML_LIMITED_BOT_UA_RE_STRING)).toBe(true);
  });

  it.each(Object.entries(DEFAULT_BOTS))(
    'metadata: %s (Next default list) still gets blocking metadata',
    (_n, ua) => {
      expect(streams(ua)).toBe(false);
    }
  );

  it.each(Object.entries(BROWSERS))(
    'metadata: %s streams (not held back waiting for dynamic metadata)',
    (_n, ua) => {
      expect(streams(ua)).toBe(true);
    }
  );

  it('metadata: an all-agents pattern would hold browsers back (control)', () => {
    expect(streams(BROWSERS.desktopChrome, '.*')).toBe(false);
  });
});
