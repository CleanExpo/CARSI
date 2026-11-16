/**
 * Browser side of the analytics consent gate (GP-731). The rules live in ./consent.ts; this file
 * reads and writes the visitor's choice, tells the page when it changes, withdraws analytics on a
 * "no", and installs the last check at the browser's exit (the wire guard).
 */
import {
  type AnalyticsChoice,
  CONSENT_CHANGED_EVENT,
  CONSENT_STORAGE_KEY,
  COOKIE_SETTINGS_EVENT,
  isCollectionUrl,
  readAnalyticsChoice,
  screenCollect,
  writeAnalyticsChoice,
} from './consent';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __carsiAnalyticsGuard?: { measurementId: string; dropped: number };
  }
}

function localStore(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** The choice as stored right now. Read live every time; nothing caches it. */
export function getAnalyticsChoice(): AnalyticsChoice {
  return readAnalyticsChoice(localStore());
}

/** For useSyncExternalStore on the server: there is never a choice during rendering there. */
export function getServerAnalyticsChoice(): AnalyticsChoice {
  return 'unset';
}

/** Notifies `onChange` when the choice changes in this tab or another. Returns the unsubscribe. */
export function subscribeAnalyticsChoice(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === CONSENT_STORAGE_KEY) onChange();
  };
  window.addEventListener(CONSENT_CHANGED_EVENT, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CONSENT_CHANGED_EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
}

const withdrawListeners = new Set<() => void>();

/** Called on every "no" (stored here or seen from another tab), after the cookies are deleted. */
export function onAnalyticsWithdrawn(listener: () => void): () => void {
  withdrawListeners.add(listener);
  return () => withdrawListeners.delete(listener);
}

/** Store the visitor's choice. A "no" also withdraws analytics from this page at once. */
export function saveAnalyticsChoice(analytics: boolean): void {
  const store = localStore();
  if (store) {
    try {
      writeAnalyticsChoice(store, analytics);
    } catch {
      // Storage refused: the choice cannot be remembered, so the gate stays closed.
    }
  }
  if (!analytics) withdrawAnalytics();
  window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
}

/** Ask the cookie settings panel to open (the footer button calls this). */
export function openCookieSettings(): void {
  window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT));
}

/** The registrable domain for cookie deletion: carsi.com.au for www.carsi.com.au. */
function cookieDomains(hostname: string): string[] {
  const parts = hostname.split('.');
  const domains = [hostname];
  if (parts.length >= 3) {
    // Covers carsi.com.au (3 labels) and www.carsi.com.au (4 labels).
    const keep = parts
      .slice(-3)
      .join('.')
      .match(/\.(com|net|org|edu|gov)\.[a-z]{2}$/)
      ? 3
      : 2;
    domains.push(parts.slice(-keep).join('.'));
  } else if (parts.length === 2) {
    domains.push(hostname);
  }
  return Array.from(new Set(domains));
}

/** Delete the Google Analytics cookies (_ga, _ga_<id>, _gid, _gat*) on this host and its domain. */
export function deleteAnalyticsCookies(): void {
  if (typeof document === 'undefined') return;
  const names = document.cookie
    .split(';')
    .map((part) => part.split('=')[0]?.trim() ?? '')
    .filter(
      (name) =>
        name === '_ga' || name.startsWith('_ga_') || name === '_gid' || name.startsWith('_gat')
    );
  const expired = 'expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; path=/';
  for (const name of names) {
    document.cookie = `${name}=; ${expired}`;
    for (const domain of cookieDomains(window.location.hostname)) {
      document.cookie = `${name}=; ${expired}; domain=${domain}`;
      document.cookie = `${name}=; ${expired}; domain=.${domain}`;
    }
  }
}

/**
 * Turn analytics off on this page: tell the library consent is denied, disable the property,
 * delete the cookies and let the event senders drop their queues. What Google already holds is
 * not deleted by this.
 */
export function withdrawAnalytics(): void {
  if (typeof window === 'undefined') return;
  const guard = window.__carsiAnalyticsGuard;
  try {
    window.gtag?.('consent', 'update', { analytics_storage: 'denied' });
  } catch {
    // The library is gone or broken; the wire guard still drops every request.
  }
  if (guard?.measurementId) {
    (window as unknown as Record<string, unknown>)[`ga-disable-${guard.measurementId}`] = true;
  }
  deleteAnalyticsCookies();
  for (const listener of withdrawListeners) {
    try {
      listener();
    } catch {
      // A listener's failure must not stop the others.
    }
  }
}

/** Undo the property disable flag after a fresh "yes" on the same page. */
export function reenableAnalytics(measurementId: string): void {
  (window as unknown as Record<string, unknown>)[`ga-disable-${measurementId}`] = false;
}

function urlOf(input: unknown): string | null {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  if (typeof Request !== 'undefined' && input instanceof Request) return input.url;
  return null;
}

function absolute(url: string): string {
  try {
    return new URL(url, window.location.href).href;
  } catch {
    return url;
  }
}

/**
 * The last check at the browser's exit. Every request the page makes to a Google collection
 * address, through sendBeacon, fetch, XMLHttpRequest or an image, is screened by the same rules
 * (`screenCollect`) at the moment it is made: nothing leaves without a stored "yes", and an event
 * about a private page, an address carrying anything but the plain campaign keys, an unlisted event
 * or parameter, or a value that reads like an email or address is dropped. Installed once.
 */
export function installAnalyticsWireGuard(measurementId: string): void {
  if (typeof window === 'undefined') return;
  if (window.__carsiAnalyticsGuard) {
    window.__carsiAnalyticsGuard.measurementId = measurementId;
    return;
  }
  const state = { measurementId, dropped: 0 };
  window.__carsiAnalyticsGuard = state;

  const screen = (url: string, body: unknown) =>
    screenCollect(absolute(url), body, {
      origin: window.location.origin,
      measurementId: state.measurementId,
      choice: getAnalyticsChoice(),
    });
  const drop = () => {
    state.dropped += 1;
    document.documentElement.dataset.analyticsDropped = String(state.dropped);
  };

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const original = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) => {
      const target = urlOf(url);
      if (target === null || !isCollectionUrl(absolute(target))) return original(url, data);
      const screened = screen(target, data ?? undefined);
      if (!screened) {
        drop();
        return true;
      }
      return original(screened.url, screened.body ?? null);
    };
  }

  if (typeof window.fetch === 'function') {
    const original = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const target = urlOf(input);
      if (target === null || !isCollectionUrl(absolute(target))) return original(input, init);
      // A Request object's body cannot be read synchronously, so it is not sent.
      const body = input instanceof URL || typeof input === 'string' ? init?.body : {};
      const screened = screen(target, body ?? undefined);
      if (!screened) {
        drop();
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      return original(screened.url, { ...init, body: screened.body });
    };
  }

  if (typeof XMLHttpRequest !== 'undefined') {
    const proto = XMLHttpRequest.prototype;
    const originalOpen = proto.open;
    const originalSend = proto.send;
    const targets = new WeakMap<XMLHttpRequest, string>();
    proto.open = function open(
      this: XMLHttpRequest,
      method: string,
      url: string | URL,
      ...rest: unknown[]
    ) {
      targets.set(this, urlOf(url) ?? '');
      return (originalOpen as (...args: unknown[]) => void).call(this, method, url, ...rest);
    } as typeof proto.open;
    proto.send = function send(
      this: XMLHttpRequest,
      body?: Document | XMLHttpRequestBodyInit | null
    ) {
      const target = targets.get(this) ?? '';
      if (target && isCollectionUrl(absolute(target))) {
        const screened = screen(target, body ?? undefined);
        if (!screened) {
          drop();
          this.abort();
          return;
        }
        return originalSend.call(this, screened.body ?? null);
      }
      return originalSend.call(this, body);
    };
  }

  if (typeof HTMLImageElement !== 'undefined') {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    if (descriptor?.set && descriptor.get) {
      const { get, set } = descriptor;
      Object.defineProperty(HTMLImageElement.prototype, 'src', {
        configurable: true,
        enumerable: descriptor.enumerable,
        get(this: HTMLImageElement) {
          return get.call(this);
        },
        set(this: HTMLImageElement, value: string) {
          const target = String(value);
          if (isCollectionUrl(absolute(target))) {
            const screened = screen(target, undefined);
            if (!screened) {
              drop();
              return;
            }
            set.call(this, screened.url);
            return;
          }
          set.call(this, value);
        },
      });
    }
  }
}
