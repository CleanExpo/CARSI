/**
 * The browser tab's purchase-survey key (Authority Machine slice 1b, GP-662). Browser only.
 *
 * A tab makes one random 128-bit key, keeps it in sessionStorage, and sends it with each
 * checkout request; the server stores only a binding of it on the Stripe session. The same tab
 * comes back from Stripe to the payment-success page with the same sessionStorage, and the
 * survey sends the key to prove it is the tab that started the checkout.
 *
 * sessionStorage, not a cookie: a tab's script reads and writes it one step at a time and each
 * tab has its own, so overlapping checkouts can never replace each other's key. The server
 * never writes it. When storage is unavailable (private modes, blocked storage) there is no
 * key; checkout works as before and the optional survey is refused.
 */
export const PURCHASE_SURVEY_KEY_STORAGE_NAME = 'carsi_svk';

const KEY_SHAPE = /^[0-9a-f]{32}$/;

function tabStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** This tab's existing key, or null. Never creates one. */
export function readPurchaseSurveyKey(storage: Storage | null = tabStorage()): string | null {
  try {
    const value = storage?.getItem(PURCHASE_SURVEY_KEY_STORAGE_NAME) ?? null;
    return value && KEY_SHAPE.test(value) ? value : null;
  } catch {
    return null;
  }
}

/** This tab's key, made and stored on first use. Null when storage or crypto is unavailable. */
export function purchaseSurveyKeyForCheckout(storage: Storage | null = tabStorage()): string | null {
  const existing = readPurchaseSurveyKey(storage);
  if (existing || !storage) return existing;
  try {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    const key = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    storage.setItem(PURCHASE_SURVEY_KEY_STORAGE_NAME, key);
    // A storage that silently drops writes would leave a key the success page cannot read back.
    return readPurchaseSurveyKey(storage);
  } catch {
    return null;
  }
}

/** `{ survey_key }` for a checkout request body, or nothing when there is no key. */
export function purchaseSurveyCheckoutField(): { survey_key?: string } {
  const key = purchaseSurveyKeyForCheckout();
  return key ? { survey_key: key } : {};
}
