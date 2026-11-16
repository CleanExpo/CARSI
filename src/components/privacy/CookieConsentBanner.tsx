'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';

import { COOKIE_SETTINGS_EVENT } from '@/lib/analytics/consent';
import {
  getAnalyticsChoice,
  getServerAnalyticsChoice,
  saveAnalyticsChoice,
  subscribeAnalyticsChoice,
} from '@/lib/analytics/consent-client';

const noSubscription = () => () => {};
const isClient = () => true;
const isServer = () => false;

const choiceButton =
  'inline-flex min-h-11 min-w-[11rem] flex-1 items-center justify-center rounded-full border border-[var(--text-accent)] bg-[var(--bg-surface)] px-5 py-2.5 text-sm font-semibold text-[var(--text-accent)] transition-colors duration-200 hover:bg-[var(--bg-elevated)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text-accent)] sm:flex-none';

/**
 * The analytics choice (GP-731). Shown until the visitor chooses, and again whenever a
 * "Cookie settings" control asks for it. Two buttons of equal weight; nothing is sent to Google
 * until "Accept analytics" is pressed. Non-modal: the page stays usable while it is open.
 */
export function CookieConsentBanner() {
  const choice = useSyncExternalStore(
    subscribeAnalyticsChoice,
    getAnalyticsChoice,
    getServerAnalyticsChoice
  );
  // False on the server and during hydration, true after: the panel never appears in server
  // HTML, so a visitor who has already chosen never sees it flash.
  const mounted = useSyncExternalStore(noSubscription, isClient, isServer);
  const [reopened, setReopened] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const opener = useRef<Element | null>(null);
  const panel = useRef<HTMLElement | null>(null);
  const headingId = useId();
  const textId = useId();

  useEffect(() => {
    const onOpen = () => {
      opener.current = document.activeElement;
      setReopened(true);
    };
    window.addEventListener(COOKIE_SETTINGS_EVENT, onOpen);
    return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, onOpen);
  }, []);

  const open = mounted && (choice === 'unset' || reopened);

  // When reopened from a settings control, move focus into the panel.
  useEffect(() => {
    if (open && reopened) panel.current?.querySelector<HTMLElement>('h2')?.focus();
  }, [open, reopened]);

  const close = useCallback(() => {
    setReopened(false);
    const target = opener.current;
    opener.current = null;
    if (target instanceof HTMLElement && target.isConnected) target.focus();
  }, []);

  const choose = useCallback(
    (analytics: boolean) => {
      saveAnalyticsChoice(analytics);
      setAnnouncement(analytics ? 'Analytics on' : 'Analytics off');
      close();
    },
    [close]
  );

  useEffect(() => {
    if (!open || !reopened) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, reopened, close]);

  return (
    <>
      <p role="status" aria-live="polite" className="sr-only" data-testid="cookie-choice-status">
        {announcement}
      </p>
      {open ? (
        <section
          ref={panel}
          role="region"
          aria-labelledby={headingId}
          aria-describedby={textId}
          data-testid="cookie-consent"
          className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-4 sm:px-6 sm:pb-6"
        >
          <div className="mx-auto max-w-3xl rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-surface)] p-5 text-[var(--text-secondary)] shadow-[var(--glow-card-hover)] sm:p-6">
            <h2
              id={headingId}
              tabIndex={-1}
              className="font-display text-lg font-semibold text-[var(--text-primary)] outline-none"
            >
              Cookie settings
            </h2>
            <p id={textId} className="mt-2 text-sm leading-relaxed">
              With your permission we use Google Analytics to count visits to our public pages. It
              is never used on your dashboard, account or sign-in pages, and personal details are
              removed from page addresses before anything is sent. Nothing is sent unless you
              accept, and you can change your choice at any time with &ldquo;Cookie settings&rdquo;
              at the foot of each page. See our{' '}
              <Link
                href="/privacy#cookies"
                className="font-medium text-[var(--text-accent)] underline underline-offset-2"
              >
                privacy policy
              </Link>
              .
            </p>
            {reopened && choice !== 'unset' ? (
              <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
                Analytics is currently {choice === 'granted' ? 'on' : 'off'}.
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" className={choiceButton} onClick={() => choose(false)}>
                Reject optional
              </button>
              <button type="button" className={choiceButton} onClick={() => choose(true)}>
                Accept analytics
              </button>
              {reopened ? (
                <button
                  type="button"
                  onClick={close}
                  className="inline-flex min-h-11 items-center px-3 text-sm font-medium text-[var(--text-muted)] underline underline-offset-2 hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
