import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { isValidElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import CcwTrainingPage from '../../../app/(public)/ccw-training/page';
import CcwCarsiTruckmountPage from '../../../app/(public)/ccw-truckmount-operations/page';
import { CcwRoadshowContent } from '../../../app/(public)/events/ccw-roadshow/page';
import { ccwFreeTools } from '@/lib/marketing/ccw-free-tools';

import { CcwFreeTools } from './CcwFreeTools';

const ROOT = join(__dirname, '..', '..', '..');

/** Component types in an element tree, without rendering client components. */
function elementTypes(node: ReactNode): unknown[] {
  if (Array.isArray(node)) return node.flatMap(elementTypes);
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  return [node.type, ...elementTypes(node.props.children)];
}

type Lesson = { id: string; title: string; resources: { label?: string; url?: string }[] | null };
type Course = { slug: string; modules: { lessons: Lesson[] }[] };

const catalogue = JSON.parse(
  readFileSync(join(ROOT, 'data/seed/courses-catalog.json'), 'utf8')
) as { courses: Course[] };
const toolUrls = ccwFreeTools.map((tool) => tool.url);
const cecApproved = new Set(
  (
    JSON.parse(readFileSync(join(ROOT, 'data/seed/cec-approvals.json'), 'utf8')) as {
      approvals: { slug: string; status: string }[];
    }
  ).approvals
    .filter((a) => a.status === 'approved')
    .map((a) => a.slug)
);

describe('Free CCW tools', () => {
  it('links both tools in a new tab with rel noopener and a one-line description', () => {
    const html = renderToStaticMarkup(<CcwFreeTools />);
    expect(html).toContain('Free CCW tools');
    expect(ccwFreeTools).toHaveLength(2);
    for (const tool of ccwFreeTools) {
      expect(tool.url).toMatch(/^https:\/\/ccwonline\.com\.au\/blogs\/news\//);
      expect(html).toContain(
        `<a href="${tool.url}" target="_blank" rel="noopener noreferrer"`
      );
      expect(html).toContain(tool.title);
      expect(html).toContain(tool.description);
    }
  });

  it.each(['melbourne', 'sydney', 'brisbane', undefined])(
    'appears on the CCW roadshow page under a neutral heading (focus %s)',
    (focusSlug) => {
      const html = renderToStaticMarkup(<CcwRoadshowContent focusSlug={focusSlug} />);
      expect(html).toContain('CCW dilution tools');
      expect(html).not.toContain('Free CCW tools');
      for (const url of toolUrls) expect(html).toContain(url);
    }
  );

  it('appears on the CCW truckmount operations and CCW training pages', () => {
    expect(elementTypes(CcwCarsiTruckmountPage())).toContain(CcwFreeTools);
    expect(elementTypes(CcwTrainingPage())).toContain(CcwFreeTools);
  });

  it('is a link resource on the truckmount Unit 3.2 lesson, and in no CEC-approved course', () => {
    const truckmount = catalogue.courses.find((c) => c.slug === 'ccw-carsi-truckmount-operations');
    const lesson = truckmount?.modules
      .flatMap((m) => m.lessons)
      .find((l) => l.title === 'Unit 3.2 — Safe Operating Procedures — Reading');
    for (const tool of ccwFreeTools) {
      const resource = lesson?.resources?.find((r) => r.url === tool.url);
      expect(resource?.label).toBe(`Free CCW tool: ${tool.title}. ${tool.description}`);
    }
    const carrying = catalogue.courses
      .filter((c) => toolUrls.some((url) => JSON.stringify(c).includes(url)))
      .map((c) => c.slug);
    // CCW-CARSI product training cites the tools by design (NeoSan's dilution lesson).
    expect(carrying).toEqual(['ccw-carsi-truckmount-operations', 'neosan-labs-product-training']);
    expect(cecApproved.size).toBe(38);
    expect(carrying.filter((slug) => cecApproved.has(slug))).toEqual([]);
  });
});
