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
export function purchaseSurveyCheckoutField(storage: Storage | null = tabStorage()): {
  survey_key?: string;
} {
  const key = newPurchaseSurveyKey(storage);
  return key ? { survey_key: key } : {};
}

/**
 * Where this tab keeps the keys of its recent checkout attempts, one per purchase, for a repeat of
 * that purchase (GP-789: one slot per purchase, so buying A, then B, then A again inside the
 * window still repeats A's key).
 */
export const PURCHASE_SURVEY_PENDING_STORAGE_NAME = 'carsi_svk_pending';
/** Matches the server's course checkout repeat window (checkout-idempotency.ts). */
export const PURCHASE_SURVEY_REPEAT_WINDOW_MS = 10 * 60 * 1000;
/** At most this many recent purchases are remembered; the oldest drops off first. */
const PENDING_LIMIT = 10;

type PendingEntry = { p: string; k: string; t: number };

/**
 * The pending entries still inside their window at `now`, oldest first. Absent, malformed or
 * unreadable storage gives none (never a throw). The earlier one-purchase shape `{ p, k, t }` is
 * read as a list of one.
 */
function readPendingKeys(storage: Storage, now: number): PendingEntry[] {
  let parsed: unknown;
  try {
    const raw = storage.getItem(PURCHASE_SURVEY_PENDING_STORAGE_NAME);
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    // A malformed entry is replaced by the caller; blocked storage yields no key there.
    return [];
  }
  const list: unknown[] = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
  return list.filter((e): e is PendingEntry => isPendingEntry(e, now));
}

function isPendingEntry(e: unknown, now: number): e is PendingEntry {
  if (!e || typeof e !== 'object') return false;
  const { p, k, t } = e as { p?: unknown; k?: unknown; t?: unknown };
  return (
    typeof p === 'string' &&
    typeof k === 'string' &&
    KEY_SHAPE.test(k) &&
    typeof t === 'number' &&
    now - t >= 0 &&
    now - t < PURCHASE_SURVEY_REPEAT_WINDOW_MS
  );
}

/**
 * The same pending entries, kept in memory per storage object. A storage that is writable-looking
 * but refuses or drops the write (quota, private mode) would otherwise give every click of one
 * purchase its own key, and so its own Stripe session (GP-789). Storage is read first; memory only
 * adds an entry storage did not return.
 */
const PENDING_MEMORY = new WeakMap<Storage, PendingEntry[]>();

function mergedPendingKeys(storage: Storage, now: number): PendingEntry[] {
  const stored = readPendingKeys(storage, now);
  const remembered = (PENDING_MEMORY.get(storage) ?? []).filter((e) => isPendingEntry(e, now));
  const extra = remembered.filter((m) => !stored.some((s) => s.p === m.p && s.k === m.k));
  return [...stored, ...extra];
}

/**
 * `{ survey_key }` for one course purchase (GP-783). A repeat of the SAME purchase from this tab
 * within the repeat window (a double-click, or pressing "Buy course" again after a stall or an
 * error) sends the same key as the first attempt, so the checkout request is identical and the
 * server hands back the first Stripe session instead of opening a second one. This holds even
 * when other purchases were tried in between (GP-789). A different purchase, or the same one
 * after the window, gets a fresh key.
 *
 * `purchase` names the purchase, not the buyer (course, mode and seats; never an email). The
 * pending keys are kept apart from the five-key list, so an attempt still joins the list only when
 * checkout returns a `checkout_url` (GP-694). A tab opened from this one inside the window
 * copies the pending keys; the boundary stays "this browser", as the module note says.
 */
export function purchaseSurveyCheckoutFieldFor(
  purchase: string,
  storage: Storage | null = tabStorage(),
  now: number = Date.now()
): { survey_key?: string } {
  if (!storage) return {};
  const pending = mergedPendingKeys(storage, now);
  const repeat = pending.find((e) => e.p === purchase);
  if (repeat) return { survey_key: repeat.k };
  const key = newPurchaseSurveyKey(storage);
  if (!key) return {};
  const next = [...pending, { p: purchase, k: key, t: now }].slice(-PENDING_LIMIT);
  // Memory first: a write the storage then refuses or drops still repeats this key (GP-789).
  PENDING_MEMORY.set(storage, next);
  try {
    storage.setItem(PURCHASE_SURVEY_PENDING_STORAGE_NAME, JSON.stringify(next));
  } catch {
    // The key is still repeated from memory for this tab.
  }
  return { survey_key: key };
}
