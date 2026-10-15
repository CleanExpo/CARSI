/**
 * /iicrc-cec-courses must never list a course after its IICRC approval lapses. The page is
 * dynamic (no ISR), and each render re-checks expiry against the clock: rendered just before the
 * expiry it lists the course, requested just after it does not.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/server/public-courses-list', () => ({
  getPublishedCourseListItemsFromDatabase: vi.fn().mockResolvedValue([
    {
      id: 'c1',
      slug: 'introduction-to-porous-materials-drying',
      title: 'Introduction to Porous Materials Drying',
      price_aud: 29,
      is_free: false,
    },
  ]),
}));

import * as hub from '../../../app/(public)/iicrc-cec-courses/page';
import { getCecApproval } from './cec-approvals';

const SLUG = 'introduction-to-porous-materials-drying';
const ORIGINAL_ENV = { ...process.env };

async function renderAt(iso: string): Promise<string> {
  vi.setSystemTime(new Date(iso));
  return renderToStaticMarkup(createElement('div', null, await hub.default()));
}

afterEach(() => {
  vi.useRealTimers();
  process.env = { ...ORIGINAL_ENV };
});

describe('/iicrc-cec-courses expiry boundary', () => {
  it('is rendered per request, not ISR-cached', () => {
    expect(hub.dynamic).toBe('force-dynamic');
    expect('revalidate' in hub).toBe(false);
  });

  it('lists the course just before its approval expires and drops it just after', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    process.env.DATABASE_URL = 'postgresql://offline.invalid/test';
    const expiresAt = getCecApproval(SLUG)?.expiresAt;
    expect(expiresAt).toBe('2027-01-18');

    const before = await renderAt('2027-01-17T23:59:59Z');
    expect(before).toContain(`/courses/${SLUG}`);

    const after = await renderAt('2027-01-18T00:00:01Z');
    expect(after).not.toContain(`/courses/${SLUG}`);
  });
});
