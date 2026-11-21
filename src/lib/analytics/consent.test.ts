/**
 * GP-731: the pure rules behind the analytics consent gate. Each rule is asserted on the inputs it
 * must refuse as well as the ones it must allow, so a rule that silently allows everything fails.
 */
import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  CONSENT_NOTICE_VERSION,
  CONSENT_STORAGE_KEY,
  IDENTIFIER_ROUTES,
  PRIVATE_FIRST_SEGMENTS,
  isCollectionUrl,
  isCountedPath,
  libraryUrl,
  readAnalyticsChoice,
  safeLocation,
  safeLocationOf,
  safeReferrer,
  safeTitle,
  screenCollect,
  writeAnalyticsChoice,
  type WireContext,
} from './consent';

const ORIGIN = 'https://carsi.com.au';
const ID = 'G-LF86765F5C';

function memoryStorage(initial?: string) {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(CONSENT_STORAGE_KEY, initial);
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

describe('the stored choice', () => {
  it('is unset with nothing stored, unreadable JSON, a throwing store or an older notice', () => {
    expect(readAnalyticsChoice(null)).toBe('unset');
    expect(readAnalyticsChoice(memoryStorage())).toBe('unset');
    expect(readAnalyticsChoice(memoryStorage('{not json'))).toBe('unset');
    expect(
      readAnalyticsChoice({
        getItem: () => {
          throw new Error('blocked');
        },
      })
    ).toBe('unset');
    expect(
      readAnalyticsChoice(memoryStorage(JSON.stringify({ version: '0-old', analytics: true })))
    ).toBe('unset');
    expect(
      readAnalyticsChoice(
        memoryStorage(JSON.stringify({ version: CONSENT_NOTICE_VERSION, analytics: 'true' }))
      )
    ).toBe('unset');
  });

  it('round-trips a yes and a no under the current notice version', () => {
    const store = memoryStorage();
    writeAnalyticsChoice(store, true);
    expect(readAnalyticsChoice(store)).toBe('granted');
    writeAnalyticsChoice(store, false);
    expect(readAnalyticsChoice(store)).toBe('denied');
  });
});

describe('which pages are counted', () => {
  it.each([
    '/',
    '/courses',
    '/courses/water-damage-restoration',
    '/pathways/wrt',
    '/pricing',
    '/privacy',
    '/contact',
    '/courses/water-damage-restoration/payment-success',
  ])('counts the public page %s', (path) => {
    expect(isCountedPath(path)).toBe(true);
  });

  it.each([
    '/dashboard',
    '/dashboard/student/profile',
    '/dashboard/coaching/billing',
    '/admin/users/abc',
    '/instructor/courses/new',
    '/login',
    '/register',
    '/reset-password',
    '/forgot-password',
    '/confirm-email',
    '/credentials/clx9abcdef0123456789xyz',
    '/verify/credential/abc',
    '/verify/training-record',
    '/teams/join',
    '/unsubscribe',
    '/api/lms/courses',
    '/agents',
    '/tasks',
    '/events/ccw-roadshow/checkin',
  ])('never counts the private page %s', (path) => {
    expect(isCountedPath(path)).toBe(false);
  });

  it.each([
    ['an email in a slug', '/courses/someone@example.com'],
    ['a long digit run', '/jobs/0412345678'],
    ['a cuid', '/jobs/clx9abcdef0123456789xyz'],
    ['a uuid', '/calendar/550e8400-e29b-41d4-a716-446655440000'],
    ['a percent escape', '/courses/a%40b'],
    ['upper case', '/Courses'],
    ['a dot', '/courses/a.b'],
    ['a doubled slash', '//courses'],
    ['a trailing slash', '/courses/'],
    ['a parent step', '/courses/../dashboard'],
    ['not a string', 42],
  ])('fails closed on %s', (_label, path) => {
    expect(isCountedPath(path)).toBe(false);
  });

  it.each(['/jobs/12345', '/jobs/abc123', '/calendar/7', '/calendar/x9'])(
    'never sends a record identifier, however short: %s',
    (path) => {
      expect(isCountedPath(path)).toBe(false);
      expect(safeLocation(ORIGIN, path, '')).toBe('');
    }
  );

  it('still counts the list pages above those records', () => {
    expect(isCountedPath('/jobs')).toBe(true);
    expect(isCountedPath('/calendar')).toBe(true);
  });

  it('every dynamic page in the app is private, a readable slug, or an identifier route', () => {
    // Walk app/ for every [param] folder. A new [id]-style route that is not listed fails here, so
    // an identifier can never reach analytics just because nobody remembered to list it.
    const appDir = resolve(__dirname, '../../../app');
    const found: string[] = [];
    const walk = (dir: string, urlParts: string[]) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const name = entry.name;
        const inUrl = name.startsWith('(') ? urlParts : [...urlParts, name];
        if (name.startsWith('[')) found.push(`/${inUrl.join('/')}`);
        walk(join(dir, name), inUrl);
      }
    };
    walk(appDir, []);
    expect(found.length).toBeGreaterThan(5);
    const unaccounted = found.filter((route) => {
      const first = route.split('/')[1];
      if (first === 'api' || PRIVATE_FIRST_SEGMENTS.has(first)) return false;
      const parent = route.slice(0, route.lastIndexOf('/'));
      if (IDENTIFIER_ROUTES.includes(parent)) return false;
      // A readable slug or a fixed type name is a page name, not a record identifier.
      return !/\/\[(slug|type)\]$/.test(route);
    });
    expect(unaccounted).toEqual([]);
  });
});

describe('the address that is sent', () => {
  it('keeps only the three plain campaign keys and strips every other key', () => {
    expect(
      safeLocation(
        ORIGIN,
        '/courses/water',
        '?email=jane%40example.com&token=abc123&utm_source=newsletter&session_id=cs_test_1&gclid=x&utm_medium=email&utm_term=jane&utm_campaign=nov'
      )
    ).toBe(`${ORIGIN}/courses/water?utm_source=newsletter&utm_medium=email&utm_campaign=nov`);
  });

  it('drops a campaign value that carries an email, a phone number or odd characters', () => {
    expect(safeLocation(ORIGIN, '/', '?utm_source=jane@example.com')).toBe(`${ORIGIN}/`);
    expect(safeLocation(ORIGIN, '/', '?utm_campaign=0412345678')).toBe(`${ORIGIN}/`);
    expect(safeLocation(ORIGIN, '/', '?utm_source=a&utm_source=b')).toBe(`${ORIGIN}/`);
  });

  it('is empty for a private page or an origin that is not plain', () => {
    expect(safeLocation(ORIGIN, '/dashboard', '')).toBe('');
    expect(safeLocation('javascript:alert(1)', '/', '')).toBe('');
    expect(safeLocationOf(`${ORIGIN}/login?next=/dashboard`, ORIGIN)).toBe('');
    expect(safeLocationOf('https://evil.example/courses', ORIGIN)).toBe('');
  });

  it('sends only the origin of another site as referrer, and nothing for a private page here', () => {
    expect(safeReferrer('https://www.google.com/search?q=jane+smith', ORIGIN)).toBe(
      'https://www.google.com'
    );
    expect(safeReferrer(`${ORIGIN}/courses/water?email=a@b.c`, ORIGIN)).toBe(
      `${ORIGIN}/courses/water`
    );
    expect(safeReferrer(`${ORIGIN}/dashboard/student/profile`, ORIGIN)).toBe('');
    expect(safeReferrer('not a url', ORIGIN)).toBe('');
  });

  it('replaces a title that reads like an email or a number', () => {
    expect(safeTitle('Water Damage Restoration | CARSI')).toBe('Water Damage Restoration | CARSI');
    expect(safeTitle('Welcome jane@example.com')).toBe('CARSI');
    expect(safeTitle('Order 12345678')).toBe('CARSI');
  });

  it('builds the library address only for a valid id', () => {
    expect(libraryUrl(ID)).toBe(`https://www.googletagmanager.com/gtag/js?id=${ID}`);
    expect(libraryUrl('GTM-ABC')).toBe('');
  });
});

describe('the wire: each request to Google is screened again as it leaves', () => {
  const context: WireContext = { origin: ORIGIN, measurementId: ID, choice: 'granted' };
  const collect = (fields: Record<string, string>) =>
    `https://region1.google-analytics.com/g/collect?${new URLSearchParams({
      v: '2',
      tid: ID,
      cid: '123.456',
      ...fields,
    })}`;
  const clean = { en: 'page_view', dl: `${ORIGIN}/courses/water`, dt: 'Water | CARSI' };

  it('recognises collection addresses and leaves the library file alone', () => {
    expect(isCollectionUrl('https://region1.google-analytics.com/g/collect?v=2')).toBe(true);
    expect(isCollectionUrl('https://www.google.com/ccm/collect?x=1')).toBe(true);
    expect(isCollectionUrl('https://stats.g.doubleclick.net/g/collect')).toBe(true);
    expect(isCollectionUrl(`https://www.googletagmanager.com/gtag/js?id=${ID}`)).toBe(false);
    expect(isCollectionUrl('https://carsi.com.au/api/lms/courses')).toBe(false);
  });

  it('lets a clean page view about a counted page through', () => {
    expect(screenCollect(collect(clean), undefined, context)).not.toBeNull();
  });

  it('sends nothing at all without a stored yes', () => {
    expect(screenCollect(collect(clean), undefined, { ...context, choice: 'unset' })).toBeNull();
    expect(screenCollect(collect(clean), undefined, { ...context, choice: 'denied' })).toBeNull();
  });

  it.each([
    ['a private page', { dl: `${ORIGIN}/dashboard` }],
    ['an email in the address', { dl: `${ORIGIN}/courses/water?email=jane%40example.com` }],
    ['a token in the address', { dl: `${ORIGIN}/courses/water?token=abc` }],
    ['another site as the address', { dl: 'https://evil.example/courses' }],
    ['a full referrer from another site', { dr: 'https://www.google.com/search?q=jane' }],
    ['an unlisted event', { en: 'form_submit' }],
    ['a user id', { uid: 'user-1' }],
    ['a user property', { 'up.email': 'x' }],
    ['an unlisted parameter', { 'ep.email': 'x' }],
    ['an email hidden in a library field', { _z: 'jane%2540example.com' }],
    ['another measurement id', { tid: 'G-OTHER12345' }],
    ['a title with an email', { dt: 'Hello jane@example.com' }],
  ])('drops a request carrying %s', (_label, fields) => {
    expect(screenCollect(collect({ ...clean, ...fields }), undefined, context)).toBeNull();
  });

  it('trims the bad events out of a batch and keeps the good ones', () => {
    const url = `https://region1.google-analytics.com/g/collect?v=2&tid=${ID}&cid=1.2&dl=${encodeURIComponent(`${ORIGIN}/courses/water`)}`;
    const body = [
      'en=course_view&ep.course_slug=water',
      'en=scroll&epn.percent_scrolled=90',
      'en=page_view&dl=' + encodeURIComponent(`${ORIGIN}/dashboard`),
    ].join('\n');
    const screened = screenCollect(url, body, context);
    expect(screened?.body).toBe('en=course_view&ep.course_slug=water');
    expect(screenCollect(url, 'en=scroll\nen=form_start', context)).toBeNull();
  });
});
