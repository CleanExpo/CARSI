import { describe, expect, it } from 'vitest';

import {
  PURCHASE_SURVEY_KEY_STORAGE_NAME,
  PURCHASE_SURVEY_KEY_LIMIT,
  purchaseSurveyKeyForCheckout,
  readPurchaseSurveyKeys,
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
