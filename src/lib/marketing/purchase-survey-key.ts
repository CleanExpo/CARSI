/**
 * The browser tab's purchase-survey keys (Authority Machine slice 1b, GP-662). Browser only.
 *
 * Every checkout makes a fresh random 128-bit key and sends it with that checkout request. Only
 * when checkout answers with a `checkout_url` is the key kept at the front of a short list in
 * sessionStorage (newest five, GP-694). The server stores only a binding of it on the new Stripe session. The same tab comes back from Stripe to the
 * payment-success page with the same sessionStorage, and the survey sends the list to prove it
 * is the tab that started the checkout.
 *
 * sessionStorage, not a cookie: a tab's script reads and writes it one step at a time and each
 * tab has its own, so overlapping checkouts can never replace each other's key. The server
 * never writes it. When storage is unavailable (private modes, blocked storage) there is no
 * key; checkout works as before and the optional survey is refused.
 *
 * Security boundary: the browser, as with the HttpOnly cookie this replaces ("this browser, and
 * only this one"). The capability keeps a person who only has the success URL (shared, logged,
 * leaked) from writing answers onto someone else's payment. It does not try to separate tabs of
 * one browser: a tab opened from another starts with a copy of the opener's sessionStorage, so
 * it holds the keys made before the copy, exactly as every tab shared the old cookie. Keys made
 * after the copy are known only to the tab that made them, because each checkout makes a new key.
 */
export const PURCHASE_SURVEY_KEY_STORAGE_NAME = 'carsi_svk';
/** At most this many recent checkout keys are kept per tab; the server accepts the same count. */
export const PURCHASE_SURVEY_KEY_LIMIT = 5;

const KEY_SHAPE = /^[0-9a-f]{32}$/;

function tabStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** This tab's recent keys, newest first (well-formed entries only). Never creates one. */
export function readPurchaseSurveyKeys(storage: Storage | null = tabStorage()): string[] {
  try {
    const value = storage?.getItem(PURCHASE_SURVEY_KEY_STORAGE_NAME) ?? '';
    return value
      .split(',')
      .filter((k) => KEY_SHAPE.test(k))
      .slice(0, PURCHASE_SURVEY_KEY_LIMIT);
  } catch {
    return [];
  }
}

/**
 * A fresh key for one checkout. It is NOT stored yet: the caller sends it with the checkout
 * request and calls `rememberPurchaseSurveyKey` only once checkout answers with a
 * `checkout_url` (GP-694). A failed, refused or free (`enrolled`) attempt therefore never takes
 * a place in the five-key list, so it cannot push out an earlier paid checkout's key before
 * that survey is answered. Null when storage or crypto is unavailable, so no key is sent that
 * the success page could never read back.
 */
export function newPurchaseSurveyKey(storage: Storage | null = tabStorage()): string | null {
  if (!storage) return null;
  try {
    // Reading first proves the storage is usable (blocked storage throws here).
    storage.getItem(PURCHASE_SURVEY_KEY_STORAGE_NAME);
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

/**
 * Stores `key` at the front of this tab's list (newest five). Call it only when the checkout it
 * was sent with returned a `checkout_url`. True when the key reads back; false (never a throw)
 * when the key is missing or malformed, or storage is unavailable or drops writes.
 */
export function rememberPurchaseSurveyKey(
  key: string | null | undefined,
  storage: Storage | null = tabStorage()
): boolean {
  if (!storage || typeof key !== 'string' || !KEY_SHAPE.test(key)) return false;
  try {
    const keys = [key, ...readPurchaseSurveyKeys(storage).filter((k) => k !== key)].slice(
      0,
      PURCHASE_SURVEY_KEY_LIMIT
    );
    storage.setItem(PURCHASE_SURVEY_KEY_STORAGE_NAME, keys.join(','));
    // A storage that silently drops writes would leave a key the success page cannot read back.
    return readPurchaseSurveyKeys(storage)[0] === key;
  } catch {
    return false;
  }
}

/**
 * `{ survey_key }` for a checkout request body, or nothing when there is no key. Nothing is
 * stored here: pass `field.survey_key` to `rememberPurchaseSurveyKey` once the checkout returns
 * a `checkout_url`.
 */
export function purchaseSurveyCheckoutField(
  storage: Storage | null = tabStorage()
): { survey_key?: string } {
  const key = newPurchaseSurveyKey(storage);
  return key ? { survey_key: key } : {};
}
