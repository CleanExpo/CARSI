'use client';

import { openCookieSettings } from '@/lib/analytics/consent-client';

/**
 * Reopens the analytics choice (GP-731). A button, not a link: it changes a setting on this page
 * rather than going anywhere. Styled by the caller so it matches the links beside it.
 */
export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      data-cookie-settings=""
      onClick={() => openCookieSettings()}
      className={className}
    >
      Cookie settings
    </button>
  );
}
