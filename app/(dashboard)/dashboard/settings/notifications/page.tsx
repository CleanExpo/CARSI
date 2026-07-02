'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/components/auth/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api/client';
import { dash } from '@/lib/dashboard-light-ui';

type EmailPreferences = { email_opt_out: boolean };

export default function NotificationSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [optOut, setOptOut] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    apiClient
      .get<EmailPreferences>('/api/lms/notifications/email-preferences')
      .then((prefs) => {
        if (active) setOptOut(prefs.email_opt_out);
      })
      .catch(() => {
        if (active) setOptOut(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const setEmailsEnabled = useCallback(
    async (enabled: boolean) => {
      if (saving) return;
      const nextOptOut = !enabled;
      const prev = optOut;
      setOptOut(nextOptOut); // optimistic
      setSaving(true);
      try {
        await apiClient.patch('/api/lms/notifications/email-preferences', {
          email_opt_out: nextOptOut,
        });
        toast({
          title: enabled ? 'Emails turned on' : 'Emails turned off',
          description: enabled
            ? 'You’ll receive CARSI toolbox-talk and update emails.'
            : 'You’ll only receive essential account and certification emails.',
        });
      } catch {
        setOptOut(prev); // revert
        toast({ title: 'Couldn’t save', description: 'Please try again.', variant: 'destructive' });
      } finally {
        setSaving(false);
      }
    },
    [optOut, saving, toast]
  );

  if (!user) {
    return (
      <div className={`mx-auto max-w-lg p-8 text-sm ${dash.muted}`}>
        Sign in to manage notifications.
      </div>
    );
  }

  const emailsEnabled = optOut === false;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 pb-16">
      <div>
        <Link
          href="/dashboard/settings"
          className="text-xs font-medium text-[#146fc2] hover:underline"
        >
          ← Back to settings
        </Link>
        <h1 className={`mt-4 text-2xl font-semibold ${dash.h1}`}>Notifications</h1>
        <p className={`mt-2 text-sm ${dash.muted}`}>
          Choose which emails CARSI sends you.
        </p>
      </div>

      <div className={`${dash.card} p-5`}>
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef7ff] text-[#146fc2]">
            <Bell className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900">Toolbox talks &amp; updates</p>
            <p className={`mt-0.5 text-xs ${dash.muted}`}>
              Monthly toolbox-talk reminders and CARSI news. Essential account, enrolment, and
              IICRC certification emails are always sent regardless of this setting.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={emailsEnabled}
            aria-label="Toolbox talks and updates emails"
            disabled={optOut === null || saving}
            onClick={() => setEmailsEnabled(!emailsEnabled)}
            className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
              emailsEnabled ? 'bg-[#2490ed]' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                emailsEnabled ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
