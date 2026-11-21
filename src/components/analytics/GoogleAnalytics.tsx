'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';

import {
  isCountedPath,
  libraryUrl,
  safeLocation,
  safeReferrer,
  safeTitle,
} from '@/lib/analytics/consent';
import {
  getAnalyticsChoice,
  getServerAnalyticsChoice,
  installAnalyticsWireGuard,
  onAnalyticsWithdrawn,
  reenableAnalytics,
  subscribeAnalyticsChoice,
} from '@/lib/analytics/consent-client';
import { markGa4Configured, resetGa4Queue } from '@/lib/analytics/ga4-client';

const configuredMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
export const analyticsMeasurementId =
  configuredMeasurementId || (process.env.NODE_ENV === 'production' ? 'G-LF86765F5C' : '');

/**
 * Google Analytics, loaded only after the visitor says yes (GP-731).
 *
 * Before a stored "yes" this renders nothing and makes no request to Google. After it, the library
 * loads with automatic page views off; each counted page sends one page_view with a clean address
 * (origin, path and plain campaign keys only), a clean referrer and a safe title. Private pages
 * (dashboard, admin, sign-in, credentials, verification) send nothing. The wire guard re-applies
 * the rules to every request at the moment it leaves the browser.
 */
export function GoogleAnalytics() {
  const pathname = usePathname();
  const choice = useSyncExternalStore(
    subscribeAnalyticsChoice,
    getAnalyticsChoice,
    getServerAnalyticsChoice
  );
  const [isReady, setIsReady] = useState(false);
  const lastPath = useRef<string | null>(null);
  // The clean address of the previous page in this visit ('' when it was private), or null
  // before the first page view, when the document referrer is used instead.
  const previousAddress = useRef<string | null>(null);
  const granted = choice === 'granted' && Boolean(analyticsMeasurementId);

  // The wire guard goes in before any library can load, and stays for the life of the page.
  useEffect(() => {
    if (!analyticsMeasurementId) return;
    installAnalyticsWireGuard(analyticsMeasurementId);
    return onAnalyticsWithdrawn(() => {
      resetGa4Queue();
      lastPath.current = null;
    });
  }, []);

  useEffect(() => {
    if (!granted) return;
    reenableAnalytics(analyticsMeasurementId);

    let attempts = 0;
    const interval = window.setInterval(() => {
      attempts += 1;
      if (typeof window.gtag === 'function') {
        setIsReady(true);
        window.clearInterval(interval);
      }
      if (attempts >= 20) window.clearInterval(interval);
    }, 250);

    return () => window.clearInterval(interval);
  }, [granted]);

  // One config, with every automatic and advertising feature off.
  useEffect(() => {
    if (!granted || !isReady || typeof window.gtag !== 'function') return;
    const { origin, pathname: path, search } = window.location;
    window.gtag('consent', 'update', { analytics_storage: 'granted' });
    window.gtag('config', analyticsMeasurementId, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: safeLocation(origin, path, search) || origin,
      page_referrer: safeReferrer(document.referrer, origin),
      page_title: 'CARSI',
    });
    // Funnel events queued before this point now have a configured GA4 destination.
    markGa4Configured();
  }, [granted, isReady]);

  // One page view per counted page.
  useEffect(() => {
    if (!granted || !isReady || typeof window.gtag !== 'function') return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    const { origin, pathname: path, search } = window.location;
    const address = safeLocation(origin, path, search);
    const referrer =
      previousAddress.current === null
        ? safeReferrer(document.referrer, origin)
        : previousAddress.current;
    previousAddress.current = address ? safeReferrer(`${origin}${path}`, origin) : '';
    if (!isCountedPath(path) || !address) return;
    window.gtag('event', 'page_view', {
      page_location: address,
      page_referrer: referrer,
      // Never document.title: a page can write anything into it. The route form is sent instead.
      page_title: safeTitle(path),
    });
  }, [granted, isReady, pathname]);

  if (!granted) return null;

  return (
    <>
      <Script src={libraryUrl(analyticsMeasurementId)} strategy="afterInteractive" />
      {/* The bootstrap is a static file, not inline: the strict Content-Security-Policy on
          the signed-in app allows own-origin and nonced scripts only, and an inline
          afterInteractive script never receives the nonce (GP-547, break 11). */}
      <Script src="/ga-init.js" strategy="afterInteractive" />
    </>
  );
}
