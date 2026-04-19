'use client';

import { useAuth } from '@/components/auth/auth-provider';
import type { User } from '@/lib/api/auth';
import { apiClient } from '@/lib/api/client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

export default function StudentProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [member, setMember] = useState('');
  const [expiry, setExpiry] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<User>('/api/lms/auth/me');
      setMember(data.iicrc_member_number ?? '');
      setExpiry(data.iicrc_expiry_date ?? '');
    } catch {
      setError('Could not load profile.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await apiClient.patch<User>('/api/lms/auth/me', {
        iicrc_member_number: member.trim() || null,
        iicrc_expiry_date: expiry.trim() || null,
      });
    } catch {
      setError('Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg p-8 text-sm text-white/50">
        Sign in to edit your profile.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 pb-16">
      <div>
        <Link
          href="/dashboard/student"
          className="text-xs font-medium text-[#7ec5ff] hover:underline"
        >
          ← Back to dashboard
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-white">IICRC profile</h1>
        <p className="mt-2 text-sm text-white/50">
          Used for renewal tracking and CEC reporting. You can update these anytime.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-white/40">Loading…</p>
      ) : (
        <form
          onSubmit={save}
          className="max-w-3xl space-y-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6"
        >
          {error ? (
            <p className="text-sm text-red-400/90" role="alert">
              {error}
            </p>
          ) : null}
          <div>
            <label htmlFor="iicrc_member" className="block text-xs font-medium text-white/50">
              IICRC member number
            </label>
            <input
              id="iicrc_member"
              type="text"
              value={member}
              onChange={(ev) => setMember(ev.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0f1a] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#2490ed]/50 focus:outline-none"
              placeholder="Optional"
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="iicrc_expiry" className="block text-xs font-medium text-white/50">
              Certification / renewal expiry date
            </label>
            <input
              id="iicrc_expiry"
              type="date"
              value={expiry}
              onChange={(ev) => setExpiry(ev.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0f1a] px-4 py-3 text-sm text-white focus:border-[#2490ed]/50 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#2490ed] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1f82d4] disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </form>
      )}
    </div>
  );
}
