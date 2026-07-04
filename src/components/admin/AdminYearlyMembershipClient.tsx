'use client';

import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, Loader2, Search } from 'lucide-react';
import Link from 'next/link';

import { adminGlassCard } from '@/components/admin/admin-learner-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type UserOpt = { id: string; email: string; fullName: string | null };

type GrantResult = {
  userId: string;
  email: string;
  accountCreated: boolean;
  coursesGranted: number;
  alreadyEnrolled: number;
  coursesFailed: number;
  publishedCourseCount: number;
  priceLabel: string;
};

export function AdminYearlyMembershipClient() {
  const [publishedCourseCount, setPublishedCourseCount] = useState<number | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [pricingMode, setPricingMode] = useState<'free' | 'custom'>('free');
  const [priceAud, setPriceAud] = useState('795');
  const [userQuery, setUserQuery] = useState('');
  const [userHits, setUserHits] = useState<UserOpt[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GrantResult | null>(null);

  const loadMeta = useCallback(async () => {
    setLoadingMeta(true);
    try {
      const res = await fetch('/api/admin/yearly-membership', { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.publishedCourseCount === 'number') {
        setPublishedCourseCount(data.publishedCourseCount);
      }
    } finally {
      setLoadingMeta(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing RA-4192 rule promotion; behaviour-preserving suppression, real fix tracked separately
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    const q = userQuery.trim();
    if (q.length < 3) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing RA-4192 rule promotion; behaviour-preserving suppression, real fix tracked separately
      setUserHits([]);
      return;
    }
    const t = setTimeout(() => {
      setSearching(true);
      fetch(`/api/admin/users/search?q=${encodeURIComponent(q)}`, { credentials: 'include' })
        .then((r) => r.json())
        .then((d) => {
          setUserHits(Array.isArray(d.users) ? d.users : []);
        })
        .catch(() => setUserHits([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [userQuery]);

  function pickUser(u: UserOpt) {
    setEmail(u.email);
    setFullName(u.fullName ?? '');
    setUserQuery('');
    setUserHits([]);
    setResult(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/yearly-membership', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          fullName: fullName.trim() || undefined,
          pricingMode,
          priceAud: pricingMode === 'custom' ? Number.parseFloat(priceAud) : 0,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as GrantResult & { detail?: string };
      if (!res.ok) {
        setError(typeof data.detail === 'string' ? data.detail : 'Grant failed');
        return;
      }
      setResult(data);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-8 flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: 'rgba(36, 144, 237, 0.12)',
            border: '1px solid rgba(36, 144, 237, 0.28)',
          }}
        >
          <BadgeCheck className="h-5 w-5 text-[#2490ed]" aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Yearly Membership</h1>
          <p className="mt-1 text-sm text-white/45">
            Grant a learner access to every published course. They receive an email with sign-in
            details and membership information.
          </p>
          {loadingMeta ? (
            <p className="mt-2 text-xs text-white/30">Loading catalogue…</p>
          ) : publishedCourseCount != null ? (
            <p className="mt-2 text-xs text-white/40">
              {publishedCourseCount} published course{publishedCourseCount === 1 ? '' : 's'} will be
              included.
            </p>
          ) : null}
        </div>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className={cn(adminGlassCard, 'space-y-6 p-6')}>
        <div className="space-y-2">
          <Label htmlFor="ym-search" className="text-white/70">
            Find existing learner (optional)
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-white/30" />
            <Input
              id="ym-search"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Search by email or name…"
              className="border-white/10 bg-white/[0.03] pl-9 text-white"
              autoComplete="off"
            />
            {searching ? (
              <Loader2 className="absolute top-2.5 right-3 h-4 w-4 animate-spin text-white/40" />
            ) : null}
          </div>
          {userHits.length > 0 ? (
            <ul className="max-h-40 overflow-y-auto rounded-lg border border-white/10 bg-[#0a0f18]">
              {userHits.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => pickUser(u)}
                    className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-white/[0.04]"
                  >
                    <span className="text-white/90">{u.email}</span>
                    {u.fullName ? (
                      <span className="text-xs text-white/40">{u.fullName}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="ym-email" className="text-white/70">
              Email address
            </Label>
            <Input
              id="ym-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="learner@company.com"
              className="border-white/10 bg-white/[0.03] text-white"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="ym-name" className="text-white/70">
              Full name (optional)
            </Label>
            <Input
              id="ym-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Used in welcome email"
              className="border-white/10 bg-white/[0.03] text-white"
            />
          </div>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-white/70">Pricing</legend>
          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-white/80">
            <input
              type="radio"
              name="ym-pricing"
              className="mt-1"
              checked={pricingMode === 'free'}
              onChange={() => setPricingMode('free')}
            />
            <span>
              <span className="font-medium text-white">Complimentary</span>
              <span className="mt-0.5 block text-xs text-white/40">No charge — full library access</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-white/80">
            <input
              type="radio"
              name="ym-pricing"
              className="mt-1"
              checked={pricingMode === 'custom'}
              onChange={() => setPricingMode('custom')}
            />
            <span className="flex-1">
              <span className="font-medium text-white">Custom lump sum (AUD)</span>
              <span className="mt-0.5 block text-xs text-white/40">
                Recorded on enrollments for reporting — payment collected outside CARSI if needed
              </span>
              {pricingMode === 'custom' ? (
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={priceAud}
                  onChange={(e) => setPriceAud(e.target.value)}
                  className="mt-2 max-w-[200px] border-white/10 bg-white/[0.03] text-white"
                  aria-label="Lump sum price in AUD"
                />
              ) : null}
            </span>
          </label>
        </fieldset>

        <p className="text-xs leading-relaxed text-white/35">
          A new temporary password is issued and emailed to the learner (including existing
          accounts). They can change it after signing in.
        </p>

        {error ? (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        {result ? (
          <div className="rounded-md border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            <p className="font-medium">Yearly Membership granted</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-emerald-100/90">
              <li>
                {result.accountCreated ? 'New account created' : 'Existing account updated'} for{' '}
                {result.email}
              </li>
              <li>{result.priceLabel}</li>
              <li>
                {result.coursesGranted} new enrollment
                {result.coursesGranted === 1 ? '' : 's'}
                {result.alreadyEnrolled > 0
                  ? ` · ${result.alreadyEnrolled} already enrolled`
                  : ''}
                {result.coursesFailed > 0 ? ` · ${result.coursesFailed} failed` : ''}
              </li>
              <li>Welcome email sent with login credentials</li>
            </ul>
            <Link
              href={`/admin/users/${result.userId}`}
              className="mt-3 inline-block text-[#7ec5ff] underline hover:text-[#a8d8ff]"
            >
              View learner profile
            </Link>
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={submitting || !email.trim()}
          className="w-full bg-[#2490ed] text-white hover:bg-[#1a7fd4]"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Granting access…
            </>
          ) : (
            'Grant Yearly Membership & send email'
          )}
        </Button>
      </form>
    </div>
  );
}
