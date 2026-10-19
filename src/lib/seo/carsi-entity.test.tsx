/**
 * One CARSI entity everywhere a search or answer engine reads it. On 18/10/2026 the live
 * llms.txt gave info@carsi.com.au while the Organization schema gave support@; the schema
 * carried locality only while the footer printed the PO Box and postcode; and both schema
 * builders opened with an unsupported "Australia's leading" superlative. Each surface must
 * render the same record from src/lib/seo/carsi-entity.ts.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PublicFooter } from '@/components/landing/PublicFooter';
import { OrganizationSchema } from '@/components/seo/JsonLd';
import { buildOrganizationSchema } from '@/lib/schema/organization';

import { CARSI_ENTITY, postalAddressLine } from './carsi-entity';
import { buildLlmsTxt } from './llms-txt';

type Org = {
  name: string;
  legalName?: string;
  url: string;
  email: string;
  description: string;
  sameAs: string[];
  address: Record<string, string>;
};

function renderedOrganization(): Org {
  const html = renderToStaticMarkup(createElement(OrganizationSchema));
  const json = html.match(/<script[^>]*>([\s\S]*?)<\/script>/)?.[1];
  if (!json) throw new Error('OrganizationSchema rendered no JSON-LD');
  return JSON.parse(json) as Org;
}

const SUPERLATIVE = /\b(leading|best|largest|#1|number one|premier|top)\b/i;
const sameAsUrls = CARSI_ENTITY.sameAs.map((s) => s.url);

function expectOrganizationMatchesEntity(org: Org) {
  expect(org.name).toBe(CARSI_ENTITY.name);
  expect(org.legalName).toBe(CARSI_ENTITY.legalName);
  expect(org.url).toBe(CARSI_ENTITY.url);
  expect(org.email).toBe(CARSI_ENTITY.email);
  expect(org.sameAs).toEqual(sameAsUrls);
  expect(org.address).toMatchObject({
    postOfficeBoxNumber: CARSI_ENTITY.address.postOfficeBox,
    addressLocality: CARSI_ENTITY.address.locality,
    addressRegion: CARSI_ENTITY.address.region,
    postalCode: CARSI_ENTITY.address.postcode,
    addressCountry: CARSI_ENTITY.address.country,
  });
  expect(org.description).not.toMatch(SUPERLATIVE);
}

function publicEmails(text: string): string[] {
  return [...new Set(text.match(/[a-z0-9._-]+@carsi\.com\.au/gi) ?? [])];
}

describe('CARSI entity consistency', () => {
  it('the rendered Organization JSON-LD matches the entity record', () => {
    expectOrganizationMatchesEntity(renderedOrganization());
  });

  it('the schema builder in src/lib/schema matches the same record', () => {
    expectOrganizationMatchesEntity(buildOrganizationSchema() as unknown as Org);
  });

  it.each(['chrome', 'light'] as const)(
    'the %s footer prints the same address, email and profiles',
    (tone) => {
      const html = renderToStaticMarkup(createElement(PublicFooter, { tone }));
      expect(html).toContain(postalAddressLine());
      expect(html).toContain(`href="mailto:${CARSI_ENTITY.email}"`);
      for (const url of sameAsUrls) expect(html).toContain(`href="${url}"`);
      expect(publicEmails(html)).toEqual([CARSI_ENTITY.email]);
    }
  );

  it('llms.txt prints the same email, address and profiles, and no other contact email', () => {
    const text = buildLlmsTxt({
      courses: [{ slug: 'a-course', title: 'A course' }],
      membership: {
        priceCents: 79500,
        available: true,
        terms: 'Access to all published courses for one learner for a year.',
      },
      cecCourses: [],
    });
    expect(text).toContain(CARSI_ENTITY.email);
    expect(text).toContain(postalAddressLine());
    for (const url of sameAsUrls) expect(text).toContain(url);
    expect(publicEmails(text)).toEqual([CARSI_ENTITY.email]);
  });
});
