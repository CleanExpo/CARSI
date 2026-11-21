import { describe, expect, it } from 'vitest';

import {
  PURCHASE_SURVEY_KEY_STORAGE_NAME,
  PURCHASE_SURVEY_KEY_LIMIT,
  purchaseSurveyCheckoutField,
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

/** One checkout that returned a checkout_url: the key is made, sent, then remembered. */
function purchaseSurveyKeyForCheckout(storage: Storage | null): string | null {
  const field = purchaseSurveyCheckoutField(storage);
  return rememberPurchaseSurveyKey(field, storage) ? field.survey_key! : null;
}

describe('the browser tab purchase-survey keys (GP-662)', () => {
  it('makes a fresh 32-hex key for every checkout and keeps the newest first', () => {
    const tab = memoryStorage();
    expect(readPurchaseSurveyKeys(tab)).toEqual([]);
    const first = purchaseSurveyKeyForCheckout(tab);
    const second = purchaseSurveyKeyForCheckout(tab);
    expect(first).toMatch(/^[0-9a-f]{32}$/);
    expect(second).toMatch(/^[0-9a-f]{32}$/);
    expect(second).not.toBe(first);
    expect(readPurchaseSurveyKeys(tab)).toEqual([second, first]);
  });

  it('keeps at most five keys; the oldest drops off', () => {
    expect(PURCHASE_SURVEY_KEY_LIMIT).toBe(5);
    const tab = memoryStorage();
    const made = Array.from({ length: 7 }, () => purchaseSurveyKeyForCheckout(tab));
    expect(readPurchaseSurveyKeys(tab)).toEqual(made.slice(2).reverse());
  });

  it('a copied tab shares only the keys made before the copy; later checkouts get keys the other tab never sees', () => {
    const opener = memoryStorage();
    const before = purchaseSurveyKeyForCheckout(opener);
    const child = copyOf(opener);
    const openerLater = purchaseSurveyKeyForCheckout(opener)!;
    const childLater = purchaseSurveyKeyForCheckout(child)!;
    expect(openerLater).not.toBe(childLater);
    expect(readPurchaseSurveyKeys(opener)).toEqual([openerLater, before]);
    expect(readPurchaseSurveyKeys(child)).toEqual([childLater, before]);
    expect(readPurchaseSurveyKeys(child)).not.toContain(openerLater);
    expect(readPurchaseSurveyKeys(opener)).not.toContain(childLater);
  });

  it('two tabs get different keys and neither changes the other', () => {
    const [one, two] = [memoryStorage(), memoryStorage()];
    const a = purchaseSurveyKeyForCheckout(one);
    const b = purchaseSurveyKeyForCheckout(two);
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
    const key = purchaseSurveyKeyForCheckout(tab);
    expect(key).toMatch(/^[0-9a-f]{32}$/);
    expect(readPurchaseSurveyKeys(tab)).toEqual([key]);
    tab.setItem(PURCHASE_SURVEY_KEY_STORAGE_NAME, `${key},zz,${'A'.repeat(32)}`);
    expect(readPurchaseSurveyKeys(tab)).toEqual([key]);
  });

  it('no storage, throwing storage, or storage that drops writes: no key and no throw', () => {
    expect(purchaseSurveyKeyForCheckout(null)).toBeNull();
    const throwing = memoryStorage();
    throwing.getItem = () => {
      throw new Error('SecurityError');
    };
    expect(purchaseSurveyKeyForCheckout(throwing)).toBeNull();
    expect(readPurchaseSurveyKeys(throwing)).toEqual([]);
    const dropping = memoryStorage();
    dropping.setItem = () => {};
    expect(purchaseSurveyKeyForCheckout(dropping)).toBeNull();
  });
});

describe('purchaseSurveyCheckoutField and rememberPurchaseSurveyKey (GP-694)', () => {
  it('the wrapper gives a checkout body a fresh 32-hex survey_key', () => {
    const tab = memoryStorage();
    const a = purchaseSurveyCheckoutField(tab);
    const b = purchaseSurveyCheckoutField(tab);
    expect(Object.keys(a)).toEqual(['survey_key']);
    expect(a.survey_key).toMatch(/^[0-9a-f]{32}$/);
    expect(b.survey_key).toMatch(/^[0-9a-f]{32}$/);
    expect(b.survey_key).not.toBe(a.survey_key);
    expect({ slug: 'x', ...a }).toEqual({ slug: 'x', survey_key: a.survey_key });
  });

  it('making the field stores nothing: the key is kept only once checkout returns a checkout_url', () => {
    const tab = memoryStorage();
    const field = purchaseSurveyCheckoutField(tab);
    expect(tab.length).toBe(0);
    expect(readPurchaseSurveyKeys(tab)).toEqual([]);
    expect(rememberPurchaseSurveyKey(field, tab)).toBe(true);
    expect(readPurchaseSurveyKeys(tab)).toEqual([field.survey_key]);
  });

  it("failed or free attempts after a paid checkout never push the paid checkout's key out", () => {
    const tab = memoryStorage();
    const paid = purchaseSurveyKeyForCheckout(tab);
    for (let i = 0; i < PURCHASE_SURVEY_KEY_LIMIT + 2; i++) purchaseSurveyCheckoutField(tab);
    expect(readPurchaseSurveyKeys(tab)).toEqual([paid]);
  });

  it('no storage, or storage that throws: no survey_key, so checkout bodies carry nothing', () => {
    expect(purchaseSurveyCheckoutField(null)).toEqual({});
    const throwing = memoryStorage();
    throwing.getItem = () => {
      throw new Error('SecurityError');
    };
    expect(purchaseSurveyCheckoutField(throwing)).toEqual({});
  });

  it('remembering nothing, or into storage that drops or refuses writes, reports false', () => {
    const tab = memoryStorage();
    expect(rememberPurchaseSurveyKey({}, tab)).toBe(false);
    expect(rememberPurchaseSurveyKey({ survey_key: 'not-a-key' }, tab)).toBe(false);
    expect(tab.length).toBe(0);
    const field = purchaseSurveyCheckoutField(tab);
    expect(rememberPurchaseSurveyKey(field, null)).toBe(false);
    const dropping = memoryStorage();
    dropping.setItem = () => {};
    expect(rememberPurchaseSurveyKey(field, dropping)).toBe(false);
    const refusing = memoryStorage();
    refusing.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    expect(rememberPurchaseSurveyKey(field, refusing)).toBe(false);
  });
});
