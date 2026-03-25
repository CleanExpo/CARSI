'use client';
import { useEffect, useState } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const DISMISSED_KEY = 'carsi_push_dismissed';
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

export function PushNotificationPrompt() {
  const { isSupported, permission, requestAndSubscribe } = usePushNotifications();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isSupported) return;
    if (!VAPID_PUBLIC_KEY) return;
    if (permission !== 'default') return;

    const dismissed = typeof window !== 'undefined' && localStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;

    // Show after 3 seconds — non-intrusive delay
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, [isSupported, permission]);

  function handleDismiss() {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, 'true');
  }

  async function handleEnable() {
    await requestAndSubscribe();
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3"
      role="banner"
      aria-label="Push notification opt-in"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="truncate text-sm font-medium text-foreground">Stay on top of your learning</p>
        <p className="text-xs text-muted-foreground">
          Get notified about your learning streaks and new courses.
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <button
          onClick={handleEnable}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-80"
        >
          Enable Notifications
        </button>
        <button
          onClick={handleDismiss}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground/90"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
