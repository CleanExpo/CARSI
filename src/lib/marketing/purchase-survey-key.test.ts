import { describe, expect, it } from 'vitest';

import {
  PURCHASE_SURVEY_KEY_STORAGE_NAME,
  purchaseSurveyKeyForCheckout,
  readPurchaseSurveyKey,
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

describe('the browser tab purchase-survey key (GP-662)', () => {
  it('makes a 32-hex key on first checkout, stores it, and reuses it for every later checkout', () => {
    const tab = memoryStorage();
    expect(readPurchaseSurveyKey(tab)).toBeNull();
    const first = purchaseSurveyKeyForCheckout(tab);
    expect(first).toMatch(/^[0-9a-f]{32}$/);
    expect(tab.getItem(PURCHASE_SURVEY_KEY_STORAGE_NAME)).toBe(first);
    expect(purchaseSurveyKeyForCheckout(tab)).toBe(first);
    expect(purchaseSurveyKeyForCheckout(tab)).toBe(first);
    expect(readPurchaseSurveyKey(tab)).toBe(first);
  });

  it('two tabs get different keys and neither changes the other', () => {
    const [one, two] = [memoryStorage(), memoryStorage()];
    const a = purchaseSurveyKeyForCheckout(one);
    const b = purchaseSurveyKeyForCheckout(two);
    expect(a).not.toBe(b);
    expect(readPurchaseSurveyKey(one)).toBe(a);
    expect(readPurchaseSurveyKey(two)).toBe(b);
  });

  it('reading never creates a key', () => {
    const tab = memoryStorage();
    expect(readPurchaseSurveyKey(tab)).toBeNull();
    expect(tab.length).toBe(0);
  });

  it('replaces a malformed stored value instead of sending it', () => {
    const tab = memoryStorage();
    tab.setItem(PURCHASE_SURVEY_KEY_STORAGE_NAME, 'not-a-key');
    expect(readPurchaseSurveyKey(tab)).toBeNull();
    const key = purchaseSurveyKeyForCheckout(tab);
    expect(key).toMatch(/^[0-9a-f]{32}$/);
  });

  it('no storage, throwing storage, or storage that drops writes: no key and no throw', () => {
    expect(purchaseSurveyKeyForCheckout(null)).toBeNull();
    const throwing = memoryStorage();
    throwing.getItem = () => {
      throw new Error('SecurityError');
    };
    expect(purchaseSurveyKeyForCheckout(throwing)).toBeNull();
    expect(readPurchaseSurveyKey(throwing)).toBeNull();
    const dropping = memoryStorage();
    dropping.setItem = () => {};
    expect(purchaseSurveyKeyForCheckout(dropping)).toBeNull();
  });
});
