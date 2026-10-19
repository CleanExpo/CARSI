import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/font/google', () => ({
  Outfit: () => ({ variable: 'font-display' }),
  Plus_Jakarta_Sans: () => ({ variable: 'font-sans' }),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));

import { PublicFooter } from '@/components/landing/PublicFooter';
import { OrganizationSchema } from '@/components/seo/JsonLd';
import { buildOrganizationSchema } from '@/lib/schema/organization';

import { CARSI_SOCIAL_PROFILES, CARSI_SOCIAL_PROFILE_URLS } from './social-profiles';

/**
 * One source of truth for CARSI's social profiles. Before this, the same four URLs were typed
 * out in five files (footer, contact page, testimonials page and two Organisation schema
 * builders), Instagram was missing from all of them, and the root layout declared an X handle
 * (`@carsi_au`) that does not exist.
 *
 * The pinned list is the set checked live on 19/10/2026: each returned 200 and named CARSI's own
 * handle (Facebook og:url /CARSIaus, LinkedIn og:url /company/carsiaus, YouTube externalId
 * UC3HpNvGJXivLGoPo4m7Qleg, Instagram og:title "CARSI (@carsi_aus)", Spotify publisher Phill
 * McGurk). X oEmbed returned 404 for carsi_au against a 200 control. Adding a profile means
 * verifying it live and updating this list in the same change.
 */
const VERIFIED_19_10_2026 = [
  'https://www.facebook.com/CARSIaus',
  'https://www.linkedin.com/company/carsiaus',
  'https://www.youtube.com/channel/UC3HpNvGJXivLGoPo4m7Qleg',
  'https://www.instagram.com/carsi_aus/',
  'https://open.spotify.com/show/4FVBn8Cfyx2jOx0m4MksuG',
];

const SOCIAL_HOST =
  /^https:\/\/(?:www\.|open\.)?(?:facebook|linkedin|youtube|instagram|spotify|x|twitter|tiktok)\.com\//;

function socialHrefs(html: string): string[] {
  const hrefs = Array.from(html.matchAll(/href="([^"]+)"/g), (m) => m[1].replace(/&amp;/g, '&'));
  return [...new Set(hrefs.filter((h) => SOCIAL_HOST.test(h)))].sort();
}

function sameAsFromHtml(html: string): string[] {
  const blocks = Array.from(
    html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g),
    (m) => JSON.parse(m[1]) as Record<string, unknown>
  );
  const org = blocks.find((b) => b['@type'] === 'EducationalOrganization');
  if (!org) throw new Error('no EducationalOrganization JSON-LD rendered');
  return [...(org.sameAs as string[])].sort();
}

const expected = [...VERIFIED_19_10_2026].sort();

describe('CARSI social profiles — one verified source of truth', () => {
  it('lists exactly the profiles verified live, with no X/Twitter or TikTok entry', () => {
    expect([...CARSI_SOCIAL_PROFILE_URLS].sort()).toEqual(expected);
    expect(CARSI_SOCIAL_PROFILES.map((p) => p.url)).toEqual([...CARSI_SOCIAL_PROFILE_URLS]);
    for (const p of CARSI_SOCIAL_PROFILES) expect(p.label.trim()).not.toBe('');
  });

  it.each(['chrome', 'light'] as const)('the %s footer links exactly the constant', (tone) => {
    const html = renderToStaticMarkup(<PublicFooter tone={tone} />);
    expect(socialHrefs(html)).toEqual(expected);
  });

  it('the contact page links exactly the constant', async () => {
    const { default: ContactPage } = await import('../../../app/(public)/contact/page');
    const html = renderToStaticMarkup(await ContactPage({ searchParams: Promise.resolve({}) }));
    expect(socialHrefs(html)).toEqual(expected);
  });

  it('the testimonials page review links come from the constant', async () => {
    const { default: TestimonialsPage } = await import('../../../app/(public)/testimonials/page');
    const html = renderToStaticMarkup(<TestimonialsPage />);
    const links = socialHrefs(html);
    expect(links.length).toBeGreaterThan(0);
    for (const href of links) expect(CARSI_SOCIAL_PROFILE_URLS).toContain(href);
  });

  it('Organisation JSON-LD sameAs equals the constant (rendered and builder)', () => {
    expect(sameAsFromHtml(renderToStaticMarkup(<OrganizationSchema />))).toEqual(expected);
    expect([...(buildOrganizationSchema().sameAs as string[])].sort()).toEqual(expected);
  });

  it('the root layout declares no twitter creator or site handle (CARSI has no X account)', async () => {
    const { metadata } = await import('../../../app/layout');
    const twitter = (metadata.twitter ?? {}) as Record<string, unknown>;
    expect(twitter.creator).toBeUndefined();
    expect(twitter.site).toBeUndefined();
    expect(twitter.card).toBe('summary_large_image');
  });
});
