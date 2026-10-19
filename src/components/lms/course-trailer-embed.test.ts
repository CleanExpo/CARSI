/**
 * Course trailer embeds. Lighthouse best-practices flagged third-party cookie issues from the
 * www.youtube.com/embed iframe on every course page with a trailer (18/10/2026). The
 * privacy-enhanced youtube-nocookie.com host sets no cookies until the visitor presses play,
 * and is already allowed by the CSP frame-src.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { buildContentSecurityPolicy } from '@/lib/security/csp';

vi.mock('@/components/lms/EnrolButton', () => ({ EnrolButton: () => null }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/courses/x',
  useRouter: () => ({ push: () => undefined }),
  useSearchParams: () => new URLSearchParams(),
}));

import { getCourseAudienceItems } from '@/lib/lms/course-audience';

import { CoursePublicDetail } from './CoursePublicDetail';

function iframeSrcs(introVideoUrl: string): string[] {
  const course = {
    slug: 'water-damage-essentials',
    title: 'Water Damage Restoration — Essentials',
    price_aud: '29',
    is_free: false,
    cec_hours: null,
    thumbnailUrl: null,
    intro_video_url: introVideoUrl,
  };
  const html = renderToStaticMarkup(
    createElement(CoursePublicDetail, {
      course,
      designation: null,
      priceLabel: '$29',
      priceNum: 29,
      learningOutcomes: [],
      audienceItems: getCourseAudienceItems(course, null),
    })
  );
  return [...html.matchAll(/<iframe\b[^>]*\ssrc="([^"]+)"/g)].map((m) =>
    m[1].replace(/&amp;/g, '&')
  );
}

describe('course trailer embed', () => {
  it.each([
    'https://www.youtube.com/watch?v=ivoWtiCSDx8',
    'https://youtu.be/ivoWtiCSDx8',
    'https://www.youtube.com/shorts/ivoWtiCSDx8',
  ])('embeds %s from youtube-nocookie.com', (url) => {
    const srcs = iframeSrcs(url);
    expect(srcs).toHaveLength(1);
    const embed = new URL(srcs[0]);
    expect(embed.origin).toBe('https://www.youtube-nocookie.com');
    expect(embed.pathname).toBe('/embed/ivoWtiCSDx8');
  });

  it('the embed host is allowed by the CSP frame-src', () => {
    const policy = buildContentSecurityPolicy({
      nonce: 'n',
      isDev: false,
      appOrigin: 'https://carsi.com.au',
      strict: true,
    });
    const frameSrc = policy
      .split(';')
      .map((d) => d.trim())
      .find((d) => d.startsWith('frame-src '));
    expect(frameSrc?.split(/\s+/)).toContain('https://www.youtube-nocookie.com');
  });
});
