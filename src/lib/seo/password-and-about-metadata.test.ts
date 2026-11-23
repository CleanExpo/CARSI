import type { Metadata } from 'next';
import { resolveTitle } from 'next/dist/lib/metadata/resolvers/resolve-title';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/font/google', () => ({
  Outfit: () => ({ variable: 'font-display' }),
  Plus_Jakarta_Sans: () => ({ variable: 'font-sans' }),
}));

vi.mock('@/lib/server/public-catalogue-facts', () => ({
  getPublicCatalogueFacts: async () => ({ publishedCourseCount: 12, disciplineCodes: ['WRT'] }),
  formatCourseCountForCopy: (n: number) => String(n),
  restorationTopicCount: () => 4,
}));

import { metadata as rootMetadata } from '../../../app/layout';
import * as forgotPasswordLayout from '../../../app/(auth)/forgot-password/layout';
import * as resetPasswordLayout from '../../../app/(auth)/reset-password/layout';
import { generateMetadata as aboutMetadata } from '../../../app/(public)/about/page';

/**
 * Live sweep 2026-11-23: https://carsi.com.au/forgot-password and /reset-password rendered the
 * root layout's default title and description (the home page's), and /about rendered
 * "About CARSI | Centre for … Information | CARSI", the brand twice.
 */
const HOME_TITLE = 'CARSI | Restoration Training, IICRC CEC Platform';
const HOME_DESCRIPTION = rootMetadata.description;

/** The title a browser shows, after Next applies the root layout's `title.template`. */
function renderedTitle(title: Metadata['title']): string {
  const template = (rootMetadata.title as { template: string }).template;
  return resolveTitle(title, template).absolute;
}

function metadataOf(mod: unknown): Metadata | undefined {
  return (mod as { metadata?: Metadata }).metadata;
}

const BANNED = /\b(IICRC|CEC|accredited|certified)\b/i;

describe.each([
  ['forgot-password', forgotPasswordLayout, 'Forgot your password | CARSI'],
  ['reset-password', resetPasswordLayout, 'Reset your password | CARSI'],
])('/%s metadata', (_name, mod, expectedTitle) => {
  const metadata = metadataOf(mod);

  it('sets its own title, not the home page default', () => {
    expect(renderedTitle(metadata?.title)).toBe(expectedTitle);
    expect(renderedTitle(metadata?.title)).not.toBe(HOME_TITLE);
  });

  it('sets its own description', () => {
    expect(typeof metadata?.description).toBe('string');
    expect((metadata?.description as string).length).toBeGreaterThan(40);
    expect(metadata?.description).not.toBe(HOME_DESCRIPTION);
  });

  it('asks search engines not to index or follow the page', () => {
    expect(metadata?.robots).toEqual({ index: false, follow: false });
  });

  it('keeps the copy plain: no IICRC, CEC, accredited or certified', () => {
    expect(renderedTitle(metadata?.title)).not.toMatch(BANNED);
    expect(metadata?.description).not.toMatch(BANNED);
  });
});

it('forgot-password and reset-password do not share a title or description', () => {
  const a = metadataOf(forgotPasswordLayout);
  const b = metadataOf(resetPasswordLayout);
  expect(a?.title).not.toEqual(b?.title);
  expect(a?.description).not.toBe(b?.description);
});

describe('/about metadata', () => {
  it('names the brand once in the rendered title', async () => {
    const title = renderedTitle((await aboutMetadata()).title);
    expect(title).toBe('About CARSI | Centre for Australian Restoration and Standards Information');
    expect(title.match(/\bCARSI\b/g)).toHaveLength(1);
  });

  it('keeps its own description', async () => {
    const { description } = await aboutMetadata();
    expect(description).toMatch(/^CARSI is an Australian online training platform/);
    expect(description).toContain('12 published courses across 4 restoration disciplines');
  });
});
