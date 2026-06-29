'use client';

import { useEffect, useRef } from 'react';

/**
 * Cloudflare Turnstile widget (issue #118). Renders only when
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY is configured; otherwise renders nothing and the
 * form proceeds (the server-side verify is likewise skipped when no secret is set).
 *
 * Loads the vanilla Turnstile script once (no extra npm dependency) and reports
 * the solved token back through `onVerify`. Pass a stable callback such as a
 * useState setter to avoid re-rendering the widget.
 */
declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        }
      ) => string;
      reset: (id?: string) => void;
    };
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Turnstile'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export function TurnstileWidget({ onVerify }: { onVerify: (token: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!SITE_KEY || !containerRef.current) return;
    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          callback: (token) => onVerify(token),
          'expired-callback': () => onVerify(''),
          'error-callback': () => onVerify(''),
        });
      })
      .catch(() => {
        /* Script blocked/unavailable — leave token empty; server decides. */
      });

    return () => {
      cancelled = true;
    };
  }, [onVerify]);

  if (!SITE_KEY) return null;
  return <div ref={containerRef} className="cf-turnstile" />;
}
