'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Search, Tag, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { previewDiscountedAud } from '@/lib/discounts/pricing-preview';
import { cn } from '@/lib/utils';

type DiscountType = 'percentage' | 'flat' | 'free' | 'custom';

type Stats = {
  activeCount: number;
  freeGrants: number;
  usersWithActiveDiscounts: number;
};

type DiscountRow = {
  id: string;
  userEmail: string;
  userName: string | null;
  courseTitle: string;
  courseSlug: string;
  listPriceAud: number;
  discountType: DiscountType;
  discountValue: number | null;
  finalAud: number;
  expiryDate: string | null;
  note: string | null;
  isEffective: boolean;
  canRevoke: boolean;
  createdAt: string;
  description: string;
};

type CourseOpt = { id: string; title: string; slug: string; priceAud: number };

type UserOpt = { id: string; email: string; fullName: string | null };

export function AdminDiscountsClient() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<DiscountRow[]>([]);
  const [courses, setCourses] = useState<CourseOpt[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [discountType, setDiscountType] = useState<DiscountType>('percentage');
  const [discountValue, setDiscountValue] = useState('20');
  const [expiry, setExpiry] = useState('');
  const [note, setNote] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserOpt[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [userQuery, setUserQuery] = useState('');
  const [userHits, setUserHits] = useState<UserOpt[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch('/api/admin/discounts', { credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.detail === 'string' ? data.detail : 'Failed to load');
      return;
    }
    setStats(data.stats);
    setRows(data.discounts ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await load();
        const cr = await fetch('/api/admin/courses', { credentials: 'include' });
        const cd = await cr.json().catch(() => ({}));
        if (cr.ok && Array.isArray(cd.courses)) {
          const mapped: CourseOpt[] = cd.courses.map(
            (c: { id: string; title: string; slug: string; priceAud: number }) => ({
              id: c.id,
              title: c.title,
              slug: c.slug,
              priceAud: Number(c.priceAud),
            })
          );
          if (!cancelled) setCourses(mapped);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    const q = userQuery.trim();
    if (q.length < 2) {
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

  const firstSelectedCourse = useMemo(() => {
    for (const c of courses) {
      if (selectedCourseIds.has(c.id)) return c;
    }
    return courses[0] ?? null;
  }, [courses, selectedCourseIds]);

  const previewList = firstSelectedCourse?.priceAud ?? 0;
  const previewFinal = useMemo(() => {
    const v =
      discountType === 'free'
        ? null
        : Number.parseFloat(discountValue.replace(',', '.'));
    const num = Number.isFinite(v) ? v : null;
    return previewDiscountedAud(previewList, discountType, num);
  }, [discountType, discountValue, previewList]);

  function toggleCourse(id: string) {
    setSelectedCourseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addUser(u: UserOpt) {
    if (selectedUserIds.includes(u.id)) return;
    setSelectedUserIds((s) => [...s, u.id]);
    setSelectedUsers((s) => [...s, u]);
    setUserQuery('');
    setUserHits([]);
  }

  function removeUser(id: string) {
    setSelectedUserIds((s) => s.filter((x) => x !== id));
    setSelectedUsers((s) => s.filter((x) => x.id !== id));
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        userIds: selectedUserIds,
        courseIds: Array.from(selectedCourseIds),
        discountType,
        note: note.trim() || null,
        expiryDate: expiry ? new Date(expiry).toISOString() : null,
      };
      if (discountType !== 'free') {
        const n = Number.parseFloat(discountValue.replace(',', '.'));
        body.discountValue = Number.isFinite(n) ? n : null;
      } else {
        body.discountValue = null;
      }

      const res = await fetch('/api/admin/discounts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.detail === 'string' ? data.detail : 'Create failed');
        return;
      }
      setNote('');
      setExpiry('');
      setSelectedCourseIds(new Set());
      setSelectedUserIds([]);
      setSelectedUsers([]);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function onRevoke(id: string) {
    setRevokeId(id);
    try {
      const res = await fetch(`/api/admin/discounts/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.detail === 'string' ? data.detail : 'Revoke failed');
        return;
      }
      await load();
    } finally {
      setRevokeId(null);
    }
  }

  if (loading && !stats) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-white/50">
        <Loader2 className="h-6 w-6 animate-spin" />
        Loading discounts…
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="mb-8 border-b border-white/10 pb-6">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-white/40 uppercase">Admin</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">Discount manager</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/50">
          Per-user, per-course pricing overrides. Free grants skip Stripe; other types adjust the checkout line item.
        </p>
      </header>

      {error ? (
        <div className="mb-6 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>
      ) : null}

      {stats ? (
        <div className="mb-10 grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Active discounts', value: stats.activeCount, accent: '#93c5fd' },
            { label: 'Free access grants', value: stats.freeGrants, accent: '#34d399' },
            { label: 'Users with discounts', value: stats.usersWithActiveDiscounts, accent: '#fbbf24' },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 shadow-[0_1px_0_rgba(255,255,255,0.05)_inset]"
            >
              <p className="text-[11px] font-semibold tracking-wide text-white/45 uppercase">{s.label}</p>
              <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: s.accent }}>
                {s.value}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-10 lg:grid-cols-2">
        <form onSubmit={onCreate} className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
          <div className="flex items-center gap-2 text-white/85">
            <Tag className="h-5 w-5 text-[#2490ed]" />
            <h2 className="text-lg font-semibold">Create discounts</h2>
          </div>

          <div className="space-y-2">
            <Label className="text-white/70">Discount type</Label>
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as DiscountType)}
              className="h-11 w-full rounded-lg border border-white/12 bg-black/40 px-3 text-sm text-white"
            >
              <option value="percentage">Percentage off</option>
              <option value="flat">Fixed amount off (AUD)</option>
              <option value="free">100% free (no Stripe)</option>
              <option value="custom">Custom price (AUD)</option>
            </select>
          </div>

          {discountType !== 'free' ? (
            <div className="space-y-2">
              <Label className="text-white/70">
                {discountType === 'percentage'
                  ? 'Percent off'
                  : discountType === 'flat'
                    ? 'Amount off (AUD)'
                    : 'Exact price (AUD)'}
              </Label>
              <Input
                type="number"
                min={0}
                step={discountType === 'percentage' ? 1 : 0.01}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="border-white/12 bg-black/40 text-white"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label className="text-white/70">Learners</Label>
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/35" />
              <Input
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Search by email (min 2 chars)…"
                className="border-white/12 bg-black/40 pl-10 text-white"
              />
              {userHits.length > 0 ? (
                <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-white/10 bg-[#0a0f1a] py-1 shadow-xl">
                  {userHits.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm text-white/85 hover:bg-white/10"
                        onClick={() => addUser(u)}
                      >
                        {u.email}
                        {u.fullName ? <span className="text-white/45"> — {u.fullName}</span> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {searching ? (
                <p className="mt-1 text-xs text-white/40">Searching…</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((u) => (
                <span
                  key={u.id}
                  className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-1 text-xs text-white/85"
                >
                  {u.email}
                  <button type="button" className="rounded p-0.5 hover:bg-white/15" onClick={() => removeUser(u.id)}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white/70">Courses</Label>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-black/25 p-2">
              {courses.length === 0 ? (
                <p className="p-2 text-sm text-white/45">No courses in database. Create courses under Admin → Courses.</p>
              ) : (
                courses.map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-2 hover:bg-white/5"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCourseIds.has(c.id)}
                      onChange={() => toggleCourse(c.id)}
                      className="mt-1"
                    />
                    <span className="text-sm text-white/80">
                      {c.title}{' '}
                      <span className="text-white/45">
                        (${Number(c.priceAud).toFixed(2)} AUD)
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-white/70">Expiry (optional)</Label>
              <Input
                type="datetime-local"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="border-white/12 bg-black/40 text-white"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-white/70">Internal note</Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Visible only to admins"
                className="border-white/12 bg-black/40 text-white"
              />
            </div>
          </div>

          <div className="rounded-xl border border-[#2490ed]/25 bg-[#2490ed]/10 px-4 py-3 text-sm text-white/85">
            <p className="font-semibold text-[#7ec5ff]">Live preview</p>
            <p className="mt-1 text-white/70">
              {firstSelectedCourse ? (
                <>
                  <span className="font-mono">${previewList.toFixed(2)}</span> AUD list →{' '}
                  <span className="font-mono font-bold text-emerald-300">${previewFinal.toFixed(2)}</span> AUD payable
                  <span className="text-white/45"> ({firstSelectedCourse.title})</span>
                </>
              ) : (
                'Select at least one course to preview against its list price.'
              )}
            </p>
          </div>

          <Button
            type="submit"
            disabled={saving || selectedUserIds.length === 0 || selectedCourseIds.size === 0}
            className="w-full bg-[#ed9d24] font-semibold text-black hover:bg-[#f2ad4e] sm:w-auto"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create {selectedUserIds.length * selectedCourseIds.size || ''} discount record(s)
          </Button>
        </form>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white/90">Active & recent</h2>
          <p className="mt-1 text-xs text-white/45">Revoking sets the row inactive; history is kept.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[11px] font-semibold tracking-wide text-white/45 uppercase">
                  <th className="pb-2 pr-2">User</th>
                  <th className="pb-2 pr-2">Course</th>
                  <th className="pb-2 pr-2">Type</th>
                  <th className="pb-2 pr-2">List → Pay</th>
                  <th className="pb-2 pr-2">Expiry</th>
                  <th className="pb-2 pr-2">Effective</th>
                  <th className="pb-2"> </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-white/[0.06] text-white/80">
                    <td className="py-3 pr-2 align-top">
                      <div className="font-medium">{r.userEmail}</div>
                      {r.userName ? <div className="text-xs text-white/45">{r.userName}</div> : null}
                    </td>
                    <td className="py-3 pr-2 align-top">
                      <div>{r.courseTitle}</div>
                      <div className="font-mono text-xs text-white/45">{r.courseSlug}</div>
                    </td>
                    <td className="py-3 pr-2 align-top">{r.discountType}</td>
                    <td className="py-3 pr-2 align-top whitespace-nowrap">
                      ${r.listPriceAud.toFixed(2)} → ${r.finalAud.toFixed(2)}
                    </td>
                    <td className="py-3 pr-2 align-top text-xs text-white/55">
                      {r.expiryDate ? new Date(r.expiryDate).toLocaleString() : '—'}
                    </td>
                    <td className="py-3 pr-2 align-top">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          r.isEffective ? 'bg-emerald-500/20 text-emerald-200' : 'bg-white/10 text-white/50'
                        )}
                      >
                        {r.isEffective ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="py-3 align-top">
                      {r.canRevoke ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-red-400/40 text-red-200 hover:bg-red-500/15"
                          disabled={revokeId === r.id}
                          onClick={() => void onRevoke(r.id)}
                        >
                          {revokeId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Revoke'}
                        </Button>
                      ) : (
                        <span className="text-xs text-white/35">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 ? <p className="py-8 text-center text-sm text-white/45">No discounts yet.</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
