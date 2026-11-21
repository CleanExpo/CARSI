/**
 * GP-731: the pure rules behind the analytics consent gate. Each rule is asserted on the inputs it
 * must refuse as well as the ones it must allow, so a rule that silently allows everything fails.
 */
import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  CONSENT_NOTICE_VERSION,
  CONSENT_STORAGE_KEY,
  IDENTIFIER_ROUTES,
  PRIVATE_FIRST_SEGMENTS,
  isCollectionUrl,
  isAllowedTextParam,
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
import { PUBLIC_ROUTES } from './public-routes';

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

describe('the public route list matches the real pages', () => {
  it('lists every public page in app/ and nothing else', () => {
    // A page missing from the list is not counted; a listed route with no page is a stale entry.
    const appDir = resolve(__dirname, '../../../app');
    const pages = new Set<string>();
    const walk = (dir: string, urlParts: string[]) => {
      if (existsSync(join(dir, 'page.tsx'))) pages.add(`/${urlParts.join('/')}`);
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const name = entry.name;
        walk(join(dir, name), name.startsWith('(') ? urlParts : [...urlParts, name]);
      }
    };
    walk(appDir, []);
    const isPrivate = (route: string) => {
      const first = route.split('/')[1];
      return (
        first === 'api' ||
        PRIVATE_FIRST_SEGMENTS.has(first) ||
        route === '/events/ccw-roadshow/checkin' ||
        route.startsWith('/events/ccw-roadshow/checkin/')
      );
    };
    const publicPages = [...pages].filter((route) => !isPrivate(route)).sort();
    expect(publicPages.length).toBeGreaterThan(50);
    expect([...PUBLIC_ROUTES].sort()).toEqual(publicPages);
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
    ).toBe(`${ORIGIN}/courses/:slug?utm_source=newsletter&utm_medium=email&utm_campaign=nov`);
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
      `${ORIGIN}/courses/:slug`
    );
    expect(safeReferrer(`${ORIGIN}/dashboard/student/profile`, ORIGIN)).toBe('');
    expect(safeReferrer('not a url', ORIGIN)).toBe('');
  });

  it('sends the route form of the page as its title, never what the page wrote', () => {
    expect(safeTitle('/courses/water')).toBe('/courses/:slug');
    expect(safeTitle('/about')).toBe('/about');
    expect(safeTitle('/dashboard')).toBe('CARSI');
    expect(safeTitle('Water Damage Restoration | CARSI')).toBe('CARSI');
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
  const clean = { en: 'page_view', dl: `${ORIGIN}/courses/:slug`, dt: '/courses/:slug' };

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

  // GP-750: a field the wire check does not know is refused, whatever its value looks like. On the
  // GP-731 code these passed, because only an email or a web address in the value was refused.
  it.each([
    ['a plain user id in an unknown field', { user_id: 'abc123' }],
    ['a member number in an unknown field', { member: 'm-2041' }],
    ['a name in an unknown field', { customer: 'jane' }],
    ['an unknown field with no value', { user_id: '' }],
  ])('drops a request carrying %s', (_label, fields) => {
    expect(screenCollect(collect({ ...clean, ...fields }), undefined, context)).toBeNull();
  });

  it('drops a batched event whose own line carries an unknown field, and keeps the rest', () => {
    const url = `https://region1.google-analytics.com/g/collect?v=2&tid=${ID}&cid=1.2&dl=${encodeURIComponent(`${ORIGIN}/courses/:slug`)}`;
    const body = 'en=course_view&ep.course_slug=water\nen=course_view&user_id=abc123';
    expect(screenCollect(url, body, context)?.body).toBe('en=course_view&ep.course_slug=water');
    expect(screenCollect(`${url}&user_id=abc123`, 'en=course_view', context)).toBeNull();
  });

  it('lets through the fields the Google library adds to a real page view and funnel events', () => {
    // The shape of a gtag.js GA4 hit: request-level bookkeeping in the address, events in the body.
    const shared = new URLSearchParams({
      v: '2',
      tid: ID,
      gtm: '45je5b10v9101234567za200',
      _p: '1732150000000',
      gcs: 'G101',
      gcd: '13l3lPl3l1l1',
      npa: '1',
      dma: '0',
      tag_exp: '101671035~101747727',
      cid: '123456789.1732150000',
      ul: 'en-au',
      sr: '1440x900',
      uaa: 'x86',
      uab: '64',
      uafvl: 'Chromium;131.0.0.0|Not_A%20Brand;24.0.0.0',
      uamb: '0',
      uam: '',
      uap: 'Linux',
      uapv: '6.5.0',
      uaw: '0',
      are: '1',
      frm: '0',
      pscdl: 'noapi',
      _eu: 'AAAI',
      _s: '1',
      sid: '1732150000',
      sct: '1',
      seg: '0',
      dl: `${ORIGIN}/courses/:slug`,
      dr: '',
      dt: '/courses/:slug',
      _tu: 'CA',
    }).toString();
    const url = `https://region1.google-analytics.com/g/collect?${shared}`;
    const body = [
      'en=page_view&_fv=1&_nsi=1&_ss=1&_ee=1&tfd=812&_et=4',
      'en=course_view&ep.course_slug=water-damage-restoration&ep.course_title=Water%20Damage&_et=9&tfd=1204',
      'en=enrol_click&ep.course_slug=water-damage-restoration&ep.purchase_mode=self&ep.is_free=false&_et=30',
      'en=checkout_started&ep.course_slug=water-damage-restoration&ep.purchase_mode=team&epn.value=495&cu=AUD&_et=5',
      'en=membership_view&ep.checkout_enabled=true&_et=2',
      'en=membership_checkout_started&epn.value=199&cu=AUD&_c=1&_dbg=1&ir=1&richsstsse=',
    ].join('\n');
    expect(screenCollect(url, body, context)).toEqual({ url, body });
    expect(screenCollect(collect({ ...clean, _z: 'ccd.AAB' }), undefined, context)).not.toBeNull();
  });

  it('sends a currency only as AUD', () => {
    expect(
      screenCollect(collect({ ...clean, en: 'checkout_started', cu: 'AUD' }), undefined, context)
    ).not.toBeNull();
    expect(
      screenCollect(collect({ ...clean, en: 'checkout_started', cu: 'jane' }), undefined, context)
    ).toBeNull();
  });

  it('trims the bad events out of a batch and keeps the good ones', () => {
    const url = `https://region1.google-analytics.com/g/collect?v=2&tid=${ID}&cid=1.2&dl=${encodeURIComponent(`${ORIGIN}/courses/:slug`)}`;
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

describe('personal data never reaches analytics, whatever shape it takes (GP-731 round 4)', () => {
  const context: WireContext = { origin: ORIGIN, measurementId: ID, choice: 'granted' };
  const wire = (fields: Record<string, string>) =>
    `https://region1.google-analytics.com/g/collect?${new URLSearchParams({
      v: '2',
      tid: ID,
      cid: '123.456',
      en: 'page_view',
      ...fields,
    })}`;
  const PERSONAL = ['0412', '345', '678', 'jane', '@'];
  const carriesNone = (value: unknown) => {
    const text = JSON.stringify(value);
    return PERSONAL.filter((bit) => text.includes(bit));
  };

  it.each(['?utm_campaign=0412-345-678', '?utm_campaign=0412%20345%20678', '?utm_source=Jane'])(
    'drops a campaign value that is not plain lower-case words: %s',
    (search) => {
      const sent = safeLocation(ORIGIN, '/courses', search);
      expect(sent).toBe(`${ORIGIN}/courses`);
      expect(carriesNone(sent)).toEqual([]);
    }
  );

  it('keeps a plain campaign value', () => {
    expect(
      safeLocation(ORIGIN, '/courses', '?utm_source=news_letter&utm_campaign=nov-launch')
    ).toBe(`${ORIGIN}/courses?utm_source=news_letter&utm_campaign=nov-launch`);
  });

  it('never sends the value typed into a page address segment', () => {
    for (const path of ['/courses/0412-345-678', '/courses/jane-smith', '/research/0412345678']) {
      const sent = safeLocation(ORIGIN, path, '');
      expect(carriesNone(sent)).toEqual([]);
      expect(carriesNone(safeReferrer(`${ORIGIN}${path}`, ORIGIN))).toEqual([]);
    }
    expect(safeLocation(ORIGIN, '/0412-345-678', '')).toBe('');
  });

  it('never sends a page title written by the page; only a name built from the route', () => {
    for (const title of ['Call 0412 345 678 | CARSI', 'Welcome jane@example.com', 'Jane Smith']) {
      expect(carriesNone(safeTitle(title))).toEqual([]);
      expect(
        screenCollect(wire({ dl: `${ORIGIN}/courses`, dt: title }), undefined, context)
      ).toBeNull();
    }
  });

  it('sends a fixed event parameter only with one of its listed values', () => {
    expect(isAllowedTextParam('purchase_mode', 'team')).toBe(true);
    expect(isAllowedTextParam('purchase_mode', '0412 345 678')).toBe(false);
    expect(isAllowedTextParam('currency', 'jane')).toBe(false);
    expect(isAllowedTextParam('is_free', true)).toBe(true);
    expect(isAllowedTextParam('course_slug', 'water-damage-restoration')).toBe(true);
    expect(isAllowedTextParam('course_slug', 'Jane Smith')).toBe(false);
    expect(isAllowedTextParam('user_email', 'x')).toBe(false);
    expect(isAllowedTextParam('value', 99)).toBe(true);
  });

  it('the wire drops a phone number in a campaign value or in the address', () => {
    for (const dl of [
      `${ORIGIN}/courses?utm_campaign=0412-345-678`,
      `${ORIGIN}/courses?utm_campaign=0412 345 678`,
      `${ORIGIN}/courses/0412-345-678`,
    ]) {
      expect(screenCollect(wire({ dl }), undefined, context)).toBeNull();
    }
  });
});
