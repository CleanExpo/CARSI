import { describe, expect, it } from 'vitest';

import { buildContentSecurityPolicy } from './csp';

/**
 * WS1 fix 2 (GP-541, directive break 3). Observed live on carsi.com.au on 2026-09-03: the
 * YouTube intro frame on course pages rendered the browser's "This content is blocked" page and
 * the Cloudinary trailer showed "Unable to play media", because the policy allowed frames only
 * from Stripe and set no media-src at all. The YouTube migration merged on 29/08 without a
 * policy change.
 *
 * This file pins the two allowances and, just as much, pins that nothing else in the policy
 * moved: script-src keeps exactly its host list (the voice widget's script host stays blocked,
 * DECISIONS #23), and every other directive is byte-for-byte what it was before the fix.
 */

const MODES = [
  { strict: false, label: 'relaxed (public pages)' },
  { strict: true, label: 'strict (authenticated app)' },
] as const;

function build(strict: boolean, isDev = false): string {
  return buildContentSecurityPolicy({
    nonce: 'NONCE',
    isDev,
    appOrigin: 'https://carsi.com.au',
    strict,
  });
}

/** Directive name to its source list, exactly as serialised. A repeated directive is a defect. */
function directives(csp: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const part of csp.split(';')) {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;
    const [name, ...sources] = tokens;
    expect(out.has(name), `directive ${name} appears twice`).toBe(false);
    out.set(name, sources);
  }
  return out;
}

const STRIPE_FRAME_HOSTS = ['https://js.stripe.com', 'https://hooks.stripe.com'];
const YOUTUBE_EMBED_HOSTS = ['https://www.youtube.com', 'https://www.youtube-nocookie.com'];
const CLOUDINARY = 'https://res.cloudinary.com';

// The policy exactly as the pre-fix builder emitted it, captured from the code at 5f287426 on
// 2026-09-03 with nonce NONCE and appOrigin https://carsi.com.au. Positive controls: the checks
// below must fail on these, and the "nothing else moved" check compares against them.
const PRE_FIX_RELAXED =
  "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.googletagmanager.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://carsi.com.au https://api.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://us.i.posthog.com https://eu.i.posthog.com; frame-src https://js.stripe.com https://hooks.stripe.com; frame-ancestors 'none'";
const PRE_FIX_STRICT =
  "default-src 'self'; script-src 'self' 'nonce-NONCE' https://js.stripe.com https://www.googletagmanager.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://carsi.com.au https://api.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://us.i.posthog.com https://eu.i.posthog.com; frame-src https://js.stripe.com https://hooks.stripe.com; frame-ancestors 'none'";

/** What a course page needs: both YouTube embed hosts framed, the Cloudinary trailer playable. */
function allowsCourseMedia(csp: string): boolean {
  const d = directives(csp);
  const frame = d.get('frame-src') ?? [];
  const media = d.get('media-src') ?? [];
  return YOUTUBE_EMBED_HOSTS.every((host) => frame.includes(host)) && media.includes(CLOUDINARY);
}

describe('Content-Security-Policy: course media may frame and play, never script', () => {
  it('rejects the pre-fix policy in both modes (positive control)', () => {
    for (const preFix of [PRE_FIX_RELAXED, PRE_FIX_STRICT]) {
      const d = directives(preFix);
      expect(d.get('frame-src')).toEqual(STRIPE_FRAME_HOSTS);
      expect(d.has('media-src')).toBe(false);
      expect(allowsCourseMedia(preFix)).toBe(false);
    }
  });

  for (const { strict, label } of MODES) {
    it(`frame-src carries the two YouTube embed hosts beside the two Stripe hosts, exactly: ${label}`, () => {
      expect(directives(build(strict)).get('frame-src')).toEqual([
        ...STRIPE_FRAME_HOSTS,
        ...YOUTUBE_EMBED_HOSTS,
      ]);
    });

    it(`media-src is self plus Cloudinary and nothing wider: ${label}`, () => {
      expect(directives(build(strict)).get('media-src')).toEqual(["'self'", CLOUDINARY]);
      expect(allowsCourseMedia(build(strict))).toBe(true);
    });

    it(`no other directive moved and script-src gained no host: ${label}`, () => {
      const before = directives(strict ? PRE_FIX_STRICT : PRE_FIX_RELAXED);
      const after = directives(build(strict));
      for (const [name, sources] of before) {
        if (name === 'frame-src') continue;
        expect(after.get(name), name).toEqual(sources);
      }
      expect([...after.keys()].filter((name) => !before.has(name))).toEqual(['media-src']);
      // The voice widget's script host stays out (DECISIONS #23); no media host reached script-src.
      expect((after.get('script-src') ?? []).join(' ')).not.toMatch(/unpkg|youtube|cloudinary|elevenlabs/i);
    });
  }

  it('keeps the dev-only allowances dev-only', () => {
    expect(directives(build(false, true)).get('script-src')).toContain("'unsafe-eval'");
    expect(directives(build(false)).get('script-src')).not.toContain("'unsafe-eval'");
    expect(directives(build(false, true)).get('media-src')).toEqual(["'self'", CLOUDINARY]);
  });
});
