'use client';

import { ChevronRight, Search } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import {
  LearnerAvatar,
  StatusBadge,
  adminGlassCard,
  completionColor,
  formatAdminDate,
  formatAdminDateTime,
} from '@/components/admin/admin-learner-ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AdminDashboardUserEntry } from '@/lib/admin/admin-dashboard-data';
import { formatAud } from '@/lib/admin/admin-ops-format';
import { cn } from '@/lib/utils';

type Segment =
  | 'all'
  | 'new'
  | 'active'
  | 'never_started'
  | 'in_progress'
  | 'completed'
  | 'incomplete'
  | 'paid'
  | 'inactive';

const SEGMENTS: { id: Segment; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New this month' },
  { id: 'active', label: 'Active learners' },
  { id: 'never_started', label: 'Bought, not started' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'completed', label: 'Completed a course' },
  { id: 'incomplete', label: 'Incomplete' },
  { id: 'paid', label: 'Has a payment' },
  { id: 'inactive', label: 'Account off' },
];

function matchesSegment(u: AdminDashboardUserEntry, segment: Segment, now: Date): boolean {
  if (segment === 'all') return true;
  if (segment === 'inactive') return !u.isActive;
  if (segment === 'paid') return u.paidEnrollmentCount > 0;
  if (segment === 'never_started') return u.neverStartedCount > 0;
  if (segment === 'in_progress') return u.activeCourseCount > 0;
  if (segment === 'completed') return u.completedCourseCount > 0;
  if (segment === 'incomplete')
    return u.enrollmentCount > 0 && u.completedCourseCount < u.enrollmentCount;
  if (segment === 'active') return u.activeCourseCount > 0 || Boolean(u.lastActiveAt);
  if (segment === 'new') {
    const created = new Date(u.createdAt);
    return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth();
  }
  return true;
}

export function AdminUsersClient({ users }: { users: AdminDashboardUserEntry[] }) {
  const searchParams = useSearchParams();
  const initial = (searchParams.get('segment') as Segment) || 'all';
  const [segment, setSegment] = useState<Segment>(
    SEGMENTS.some((s) => s.id === initial) ? initial : 'all'
  );
  const [query, setQuery] = useState('');
  const now = useMemo(() => new Date(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (!matchesSegment(u, segment, now)) return false;
      if (!q) return true;
      return [u.fullName, u.email, u.iicrcMemberNumber]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [users, segment, query, now]);

  return (
    <div className="px-5 py-8 pb-20 sm:px-8 sm:py-10">
      <header className="mb-8 max-w-3xl space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-white">Customers</h1>
        <p className="text-sm text-white/55">
          Who they are, what they bought, and whether they can get in. Open a row for payments,
          progress, and certificates.
        </p>
      </header>

      <div className="mb-5 flex flex-wrap gap-2">
        {SEGMENTS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSegment(s.id)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium',
              segment === s.id
                ? 'border-[#2490ed]/50 bg-[#2490ed]/15 text-[#7ec5ff]'
                : 'border-white/10 text-white/50 hover:text-white/80'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <Card className={adminGlassCard}>
        <CardHeader className="space-y-4 border-b border-white/[0.06] pb-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold text-white/88">Directory</CardTitle>
              <CardDescription className="text-white/45">
                {filtered.length.toLocaleString()} shown · {users.length.toLocaleString()} total
              </CardDescription>
            </div>
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name or email…"
                className="h-10 w-full rounded-xl border border-white/10 bg-black/25 pr-3 pl-9 text-sm text-white/85 outline-none placeholder:text-white/35 focus:border-[#2490ed]/40"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 pt-2">
          <div className="overflow-auto rounded-xl border border-white/[0.06] bg-black/20">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-white/45">Customer</TableHead>
                  <TableHead className="hidden text-white/45 md:table-cell">Joined</TableHead>
                  <TableHead className="hidden text-white/45 lg:table-cell">Courses</TableHead>
                  <TableHead className="hidden text-white/45 sm:table-cell">Spent</TableHead>
                  <TableHead className="hidden text-white/45 xl:table-cell">
                    Last activity
                  </TableHead>
                  <TableHead className="text-right text-white/45">Progress</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={7} className="py-14 text-center text-sm text-white/45">
                      No customers in this view. Try another filter or search.
                    </TableCell>
                  </TableRow>
                ) : null}
                {filtered.map((u) => (
                  <TableRow
                    key={u.userId}
                    className="group border-white/[0.04] hover:bg-white/[0.04]"
                  >
                    <TableCell>
                      <Link href={`/admin/users/${u.userId}`} className="flex items-center gap-3">
                        <LearnerAvatar user={u} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="truncate text-sm font-medium text-white/90">
                              {u.fullName ?? u.email}
                            </span>
                            {!u.isActive ? <StatusBadge label="Off" tone="muted" /> : null}
                            {u.neverStartedCount > 0 ? (
                              <StatusBadge label="Not started" tone="muted" />
                            ) : null}
                          </div>
                          <div className="truncate text-xs text-white/42">{u.email}</div>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden text-xs text-white/50 md:table-cell">
                      {formatAdminDate(u.createdAt)}
                    </TableCell>
                    <TableCell className="hidden text-sm text-white/65 lg:table-cell">
                      {u.enrollmentCount === 0 ? (
                        <span className="text-white/35">None</span>
                      ) : (
                        <span className="tabular-nums">
                          {u.completedCourseCount}/{u.enrollmentCount}
                          {u.certificatesCount > 0 ? ` · ${u.certificatesCount} cert` : ''}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-sm text-white/70 tabular-nums sm:table-cell">
                      {u.spentAud > 0 ? formatAud(u.spentAud) : '—'}
                    </TableCell>
                    <TableCell className="hidden text-xs text-white/45 xl:table-cell">
                      {formatAdminDateTime(u.lastActiveAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className="text-sm font-bold tabular-nums"
                        style={{
                          color: u.enrollmentCount
                            ? completionColor(u.overallCompletionPct)
                            : undefined,
                        }}
                      >
                        {u.enrollmentCount === 0 ? '—' : `${u.overallCompletionPct}%`}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/admin/users/${u.userId}`}
                        className="inline-flex h-9 w-9 items-center justify-center text-white/35 group-hover:text-[#7ec5ff]"
                        aria-label={`Open ${u.fullName ?? u.email}`}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
