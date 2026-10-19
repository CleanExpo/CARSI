import { isValidElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import ContactPage from '../../../app/(public)/contact/page';
import { ContactForm, type ContactLeadContext } from '@/components/contact/ContactForm';
import { getCcwRegisterInterestHref } from './ccw-roadshow';

type Params = Record<string, string | string[] | undefined>;

async function renderContact(params: Params) {
  return ContactPage({ searchParams: Promise.resolve(params) });
}

/** The leadContext prop handed to <ContactForm>, which is what the contact API records. */
function findLeadContext(node: ReactNode): ContactLeadContext | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findLeadContext(child);
      if (found) return found;
    }
    return undefined;
  }
  if (!isValidElement<{ leadContext?: ContactLeadContext; children?: ReactNode }>(node))
    return undefined;
  if (node.type === ContactForm) return node.props.leadContext;
  return findLeadContext(node.props.children);
}

/** Feed the exact query string the CCW pages link to into /contact. */
function paramsFromHref(href: string): Params {
  return Object.fromEntries(new URL(href, 'https://carsi.com.au').searchParams);
}

describe('/contact ccw-roadshow lead context', () => {
  it.each([
    ['Melbourne', '/ccw-melbourne'],
    ['Sydney', '/ccw-sydney'],
    ['Brisbane', '/ccw-brisbane'],
  ] as const)(
    'records the %s CCW page as the source page for its interest link',
    async (city, page) => {
      const lead = findLeadContext(
        await renderContact(paramsFromHref(getCcwRegisterInterestHref(city)))
      );
      expect(lead).toMatchObject({ source: 'ccw-roadshow', pageUrl: page });
      expect(lead?.pageUrl).not.toBe('/start-carpet-cleaning-business');
      expect(lead?.initialMessage).toContain(`the next ${city} CARSI x CCW training dates`);
    }
  );

  it('records the roadshow hub when no city is given', async () => {
    const lead = findLeadContext(await renderContact(paramsFromHref(getCcwRegisterInterestHref())));
    expect(lead).toMatchObject({ source: 'ccw-roadshow', pageUrl: '/events/ccw-roadshow' });
  });

  it.each(['perth', '../admin', 'melbourne/../../x', ''])(
    'never takes an arbitrary path from the city param: %j',
    async (city) => {
      const lead = findLeadContext(await renderContact({ source: 'ccw-roadshow', city }));
      expect(lead?.pageUrl).toBe('/events/ccw-roadshow');
    }
  );

  it('labels the enquiry as CCW training, not Start Smart', async () => {
    const markup = renderToStaticMarkup(
      await renderContact(paramsFromHref(getCcwRegisterInterestHref('Melbourne')))
    );
    expect(markup).toContain('CCW training enquiry');
    expect(markup).not.toContain('Start Smart enquiry');
  });

  it('leaves other sources on their existing branches', async () => {
    const lead = findLeadContext(await renderContact({ source: 'start-smart', topic: 'quoting' }));
    expect(lead?.pageUrl).toBe('/start-carpet-cleaning-business');
  });
});
