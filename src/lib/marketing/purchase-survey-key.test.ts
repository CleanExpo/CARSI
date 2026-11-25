import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  PURCHASE_SURVEY_KEY_STORAGE_NAME,
  PURCHASE_SURVEY_KEY_LIMIT,
  PURCHASE_SURVEY_PENDING_STORAGE_NAME,
  PURCHASE_SURVEY_REPEAT_WINDOW_MS,
  newPurchaseSurveyKey,
  purchaseSurveyCheckoutField,
  purchaseSurveyCheckoutFieldFor,
  readPurchaseSurveyKeys,
  rememberPurchaseSurveyKey,
} from './purchase-survey-key';

/** A minimal Storage, one per simulated browser tab. */
function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k: string) => data.get(k) ?? null,
    key: (i: number) => [...data.keys()][i] ?? null,
    removeItem: (k: string) => void data.delete(k),
    setItem: (k: string, v: string) => void data.set(k, String(v)),
  };
}

/** A tab opened from `tab`: browsers copy sessionStorage into it. */
function copyOf(tab: Storage): Storage {
  const copy = memoryStorage();
  for (let i = 0; i < tab.length; i++) {
    const k = tab.key(i)!;
    copy.setItem(k, tab.getItem(k)!);
  }
  return copy;
}

/** One checkout that reached Stripe: a key is made, sent, and kept once checkout_url returns. */
function paidCheckout(tab: Storage): string {
  const key = newPurchaseSurveyKey(tab)!;
  expect(rememberPurchaseSurveyKey(key, tab)).toBe(true);
  return key;
}

describe('the browser tab purchase-survey keys (GP-662)', () => {
  it('makes a fresh 32-hex key for every checkout and keeps the newest first', () => {
    const tab = memoryStorage();
    expect(readPurchaseSurveyKeys(tab)).toEqual([]);
    const first = paidCheckout(tab);
    const second = paidCheckout(tab);
    expect(first).toMatch(/^[0-9a-f]{32}$/);
    expect(second).toMatch(/^[0-9a-f]{32}$/);
    expect(second).not.toBe(first);
    expect(readPurchaseSurveyKeys(tab)).toEqual([second, first]);
  });

  it('keeps at most five keys; the oldest drops off', () => {
    expect(PURCHASE_SURVEY_KEY_LIMIT).toBe(5);
    const tab = memoryStorage();
    const made = Array.from({ length: 7 }, () => paidCheckout(tab));
    expect(readPurchaseSurveyKeys(tab)).toEqual(made.slice(2).reverse());
  });

  it('a copied tab shares only the keys made before the copy; later checkouts get keys the other tab never sees', () => {
    const opener = memoryStorage();
    const before = paidCheckout(opener);
    const child = copyOf(opener);
    const openerLater = paidCheckout(opener);
    const childLater = paidCheckout(child);
    expect(openerLater).not.toBe(childLater);
    expect(readPurchaseSurveyKeys(opener)).toEqual([openerLater, before]);
    expect(readPurchaseSurveyKeys(child)).toEqual([childLater, before]);
    expect(readPurchaseSurveyKeys(child)).not.toContain(openerLater);
    expect(readPurchaseSurveyKeys(opener)).not.toContain(childLater);
  });

  it('two tabs get different keys and neither changes the other', () => {
    const [one, two] = [memoryStorage(), memoryStorage()];
    const a = paidCheckout(one);
    const b = paidCheckout(two);
    expect(a).not.toBe(b);
    expect(readPurchaseSurveyKeys(one)).toEqual([a]);
    expect(readPurchaseSurveyKeys(two)).toEqual([b]);
  });

  it('reading never creates a key', () => {
    const tab = memoryStorage();
    expect(readPurchaseSurveyKeys(tab)).toEqual([]);
    expect(tab.length).toBe(0);
  });

  it('drops malformed stored entries instead of sending them', () => {
    const tab = memoryStorage();
    tab.setItem(PURCHASE_SURVEY_KEY_STORAGE_NAME, 'not-a-key');
    expect(readPurchaseSurveyKeys(tab)).toEqual([]);
    const key = paidCheckout(tab);
    expect(key).toMatch(/^[0-9a-f]{32}$/);
    expect(readPurchaseSurveyKeys(tab)).toEqual([key]);
    tab.setItem(PURCHASE_SURVEY_KEY_STORAGE_NAME, `${key},zz,${'A'.repeat(32)}`);
    expect(readPurchaseSurveyKeys(tab)).toEqual([key]);
  });

  it('no storage, throwing storage, or storage that drops writes: no key, nothing kept, no throw', () => {
    expect(newPurchaseSurveyKey(null)).toBeNull();
    expect(rememberPurchaseSurveyKey('0'.repeat(32), null)).toBe(false);
    const throwing = memoryStorage();
    throwing.getItem = () => {
      throw new Error('SecurityError');
    };
    expect(newPurchaseSurveyKey(throwing)).toBeNull();
    expect(rememberPurchaseSurveyKey('0'.repeat(32), throwing)).toBe(false);
    expect(readPurchaseSurveyKeys(throwing)).toEqual([]);
    const dropping = memoryStorage();
    dropping.setItem = () => {};
    expect(rememberPurchaseSurveyKey(newPurchaseSurveyKey(dropping), dropping)).toBe(false);
  });

  it('remembering refuses a missing or malformed key and leaves the list alone', () => {
    const tab = memoryStorage();
    const kept = paidCheckout(tab);
    for (const bad of [undefined, null, '', 'zz'.repeat(16), kept.toUpperCase()]) {
      expect(rememberPurchaseSurveyKey(bad, tab)).toBe(false);
    }
    expect(readPurchaseSurveyKeys(tab)).toEqual([kept]);
  });
});

describe('a key is kept only once checkout returns a checkout_url (GP-694)', () => {
  it('making a key for a checkout request stores nothing', () => {
    const tab = memoryStorage();
    expect(newPurchaseSurveyKey(tab)).toMatch(/^[0-9a-f]{32}$/);
    expect(purchaseSurveyCheckoutField(tab).survey_key).toMatch(/^[0-9a-f]{32}$/);
    expect(tab.length).toBe(0);
    expect(readPurchaseSurveyKeys(tab)).toEqual([]);
  });

  it('five failed or enrolled attempts after a paid checkout do not push its key out of the list', () => {
    const tab = memoryStorage();
    const paid = paidCheckout(tab);
    // Each attempt builds a checkout body, but checkout never returns a checkout_url.
    for (let i = 0; i < PURCHASE_SURVEY_KEY_LIMIT; i++) purchaseSurveyCheckoutField(tab);
    expect(readPurchaseSurveyKeys(tab)).toEqual([paid]);
  });

  it('remembering the same key twice keeps one copy', () => {
    const tab = memoryStorage();
    const key = paidCheckout(tab);
    expect(rememberPurchaseSurveyKey(key, tab)).toBe(true);
    expect(readPurchaseSurveyKeys(tab)).toEqual([key]);
  });
});

describe('purchaseSurveyCheckoutField(): the wrapper every checkout body spreads (GP-694)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("with this tab's sessionStorage: { survey_key } with a 32-hex key, and that key is what gets kept", () => {
    const tab = memoryStorage();
    vi.stubGlobal('window', { sessionStorage: tab });
    const field = purchaseSurveyCheckoutField();
    expect(Object.keys(field)).toEqual(['survey_key']);
    expect(field.survey_key).toMatch(/^[0-9a-f]{32}$/);
    // The body a checkout sends carries the key under exactly this name.
    expect(JSON.parse(JSON.stringify({ slug: 'x', ...field }))).toEqual({
      slug: 'x',
      survey_key: field.survey_key,
    });
    expect(rememberPurchaseSurveyKey(field.survey_key)).toBe(true);
    expect(readPurchaseSurveyKeys()).toEqual([field.survey_key]);
  });

  it('a new key for every checkout body', () => {
    vi.stubGlobal('window', { sessionStorage: memoryStorage() });
    const a = purchaseSurveyCheckoutField().survey_key;
    const b = purchaseSurveyCheckoutField().survey_key;
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(b).not.toBe(a);
  });

  it('no window, blocked sessionStorage, or storage that throws: an empty object (checkout works without a survey)', () => {
    expect(purchaseSurveyCheckoutField()).toEqual({});
    vi.stubGlobal('window', {
      get sessionStorage(): Storage {
        throw new Error('SecurityError');
      },
    });
    expect(purchaseSurveyCheckoutField()).toEqual({});
    const throwing = memoryStorage();
    throwing.getItem = () => {
      throw new Error('SecurityError');
    };
    vi.stubGlobal('window', { sessionStorage: throwing });
    expect(purchaseSurveyCheckoutField()).toEqual({});
  });
});

describe('purchaseSurveyCheckoutFieldFor(): a repeat of one purchase sends one key (GP-783)', () => {
  const T0 = Date.UTC(2026, 10, 23, 8, 0, 0);

  it('the same purchase again inside the window sends the same key, so the server reuses its session', () => {
    const tab = memoryStorage();
    const first = purchaseSurveyCheckoutFieldFor('water:self:1', tab, T0).survey_key;
    const again = purchaseSurveyCheckoutFieldFor(
      'water:self:1',
      tab,
      T0 + 9 * 60 * 1000
    ).survey_key;
    expect(first).toMatch(/^[0-9a-f]{32}$/);
    expect(again).toBe(first);
  });

  it('a different purchase, or the same one after the window, gets a fresh key', () => {
    const tab = memoryStorage();
    const water = purchaseSurveyCheckoutFieldFor('water:self:1', tab, T0).survey_key;
    const mould = purchaseSurveyCheckoutFieldFor('mould:self:1', tab, T0 + 1000).survey_key;
    const teamOf3 = purchaseSurveyCheckoutFieldFor('mould:team:3', tab, T0 + 2000).survey_key;
    const teamOf4 = purchaseSurveyCheckoutFieldFor('mould:team:4', tab, T0 + 3000).survey_key;
    expect(new Set([water, mould, teamOf3, teamOf4]).size).toBe(4);
    const later = purchaseSurveyCheckoutFieldFor(
      'mould:team:4',
      tab,
      T0 + 3000 + PURCHASE_SURVEY_REPEAT_WINDOW_MS
    ).survey_key;
    expect(later).not.toBe(teamOf4);
  });

  it('A, then B, then A again inside the window: A keeps its first key (GP-789)', () => {
    const tab = memoryStorage();
    const a = purchaseSurveyCheckoutFieldFor('water:self:1', tab, T0).survey_key;
    const b = purchaseSurveyCheckoutFieldFor('mould:self:1', tab, T0 + 60_000).survey_key;
    const aAgain = purchaseSurveyCheckoutFieldFor('water:self:1', tab, T0 + 120_000).survey_key;
    const bAgain = purchaseSurveyCheckoutFieldFor('mould:self:1', tab, T0 + 180_000).survey_key;
    expect(b).not.toBe(a);
    expect(aAgain).toBe(a);
    expect(bAgain).toBe(b);
    // Each purchase's own window still ends: A after the window is a fresh key.
    expect(
      purchaseSurveyCheckoutFieldFor('water:self:1', tab, T0 + PURCHASE_SURVEY_REPEAT_WINDOW_MS)
        .survey_key
    ).not.toBe(a);
  });

  it('an entry in the earlier one-purchase shape is still honoured (GP-789)', () => {
    const tab = memoryStorage();
    const k = 'a'.repeat(32);
    tab.setItem(
      PURCHASE_SURVEY_PENDING_STORAGE_NAME,
      JSON.stringify({ p: 'water:self:1', k, t: T0 })
    );
    expect(purchaseSurveyCheckoutFieldFor('water:self:1', tab, T0 + 1000).survey_key).toBe(k);
  });

  it('the pending list stays small however many purchases are tried (GP-789)', () => {
    const tab = memoryStorage();
    for (let i = 0; i < 50; i++) purchaseSurveyCheckoutFieldFor(`course-${i}:self:1`, tab, T0 + i);
    const stored = JSON.parse(tab.getItem(PURCHASE_SURVEY_PENDING_STORAGE_NAME) ?? '[]');
    expect(Array.isArray(stored)).toBe(true);
    expect(stored.length).toBeLessThanOrEqual(10);
  });

  it('a pending key never joins the five-key list until checkout returns a checkout_url (GP-694)', () => {
    const tab = memoryStorage();
    const paid = paidCheckout(tab);
    for (let i = 0; i < PURCHASE_SURVEY_KEY_LIMIT; i++)
      purchaseSurveyCheckoutFieldFor(`course-${i}:self:1`, tab, T0 + i);
    expect(readPurchaseSurveyKeys(tab)).toEqual([paid]);
  });

  it('storage that refuses or drops the write still repeats the key for one purchase (GP-789)', () => {
    const refusing = memoryStorage();
    refusing.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
    const dropping = memoryStorage();
    dropping.setItem = () => undefined;
    for (const tab of [refusing, dropping]) {
      const first = purchaseSurveyCheckoutFieldFor('water:self:1', tab, T0).survey_key;
      const second = purchaseSurveyCheckoutFieldFor('water:self:1', tab, T0 + 1).survey_key;
      expect(first).toMatch(/^[0-9a-f]{32}$/);
      expect(second).toBe(first);
      // A different purchase is still a different key, and the window still ends.
      expect(purchaseSurveyCheckoutFieldFor('mould:self:1', tab, T0 + 2).survey_key).not.toBe(
        first
      );
      expect(
        purchaseSurveyCheckoutFieldFor('water:self:1', tab, T0 + PURCHASE_SURVEY_REPEAT_WINDOW_MS)
          .survey_key
      ).not.toBe(first);
    }
  });

  it('a malformed pending entry, a clock that went back, or no storage: a fresh key or none, never a throw', () => {
    const tab = memoryStorage();
    tab.setItem(PURCHASE_SURVEY_PENDING_STORAGE_NAME, '{not json');
    const k = purchaseSurveyCheckoutFieldFor('water:self:1', tab, T0).survey_key;
    expect(k).toMatch(/^[0-9a-f]{32}$/);
    // The malformed entry was replaced, so the repeat reuses the new key.
    expect(purchaseSurveyCheckoutFieldFor('water:self:1', tab, T0 + 1).survey_key).toBe(k);
    expect(purchaseSurveyCheckoutFieldFor('water:self:1', tab, T0 - 1).survey_key).not.toBe(k);
    tab.setItem(
      PURCHASE_SURVEY_PENDING_STORAGE_NAME,
      JSON.stringify({ p: 'water:self:1', k: 'NOT-A-KEY', t: T0 })
    );
    expect(purchaseSurveyCheckoutFieldFor('water:self:1', tab, T0).survey_key).toMatch(
      /^[0-9a-f]{32}$/
    );
    expect(purchaseSurveyCheckoutFieldFor('water:self:1', null, T0)).toEqual({});
  });
});
