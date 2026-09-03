'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';

const configuredMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
const measurementId =
  configuredMeasurementId || (process.env.NODE_ENV === 'production' ? 'G-LF86765F5C' : '');

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function GoogleAnalytics() {
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!measurementId) return;

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
  }, []);

  useEffect(() => {
    if (!measurementId || !isReady || typeof window.gtag !== 'function') return;

    window.gtag('config', measurementId, {
      page_path: `${window.location.pathname}${window.location.search}`,
    });
  }, [isReady, pathname]);

  if (!measurementId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      {/* The bootstrap is a static file, not inline: the strict Content-Security-Policy on
          the signed-in app allows own-origin and nonced scripts only, and an inline
          afterInteractive script never receives the nonce (GP-547, break 11). */}
      <Script src="/ga-init.js" strategy="afterInteractive" />
    </>
  );
}
