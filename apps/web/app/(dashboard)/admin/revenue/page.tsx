'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';

interface RevenueByMonth {
  month: string;
  new_subs: number;
  revenue_aud: number;
}

interface RevenueData {
  mrr_aud: number;
  arr_aud: number;
  total_subscribers: number;
  trialling: number;
  cancelled_this_month: number;
  trial_to_paid_rate: number;
  revenue_by_month: RevenueByMonth[];
}

function formatAUD(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function MetricCard({
  label,
  value,
  sub,
  accentClass = 'text-primary',
}: {
  label: string;
  value: string;
  sub?: string;
  accentClass?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-sm border border-border bg-card p-5">
      <span className="text-xs tracking-widest text-muted-foreground uppercase">{label}</span>
      <span className={`text-3xl font-bold ${accentClass}`}>
        {value}
      </span>
      {sub && <span className="text-xs text-muted-foreground/50">{sub}</span>}
    </div>
  );
}

function RevenueBarChart({ data }: { data: RevenueByMonth[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground/50">No subscription data yet.</p>
    );
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenue_aud), 1);

  return (
    <div className="flex h-40 w-full items-end gap-4">
      {data.map((row) => {
        const pct = (row.revenue_aud / maxRevenue) * 100;
        return (
          <div key={row.month} className="flex flex-1 flex-col items-center gap-2">
            <span className="text-xs text-muted-foreground">{formatAUD(row.revenue_aud)}</span>
            <div className="flex h-24 w-full flex-col justify-end">
              <div
                className="w-full rounded-sm bg-primary/85 transition-all"
                style={{ height: `${Math.max(pct, 3)}%`, minHeight: '4px' }}
              />
            </div>
            <span className="text-xs text-muted-foreground/50">{row.month}</span>
            <span className="text-xs text-muted-foreground/50">{row.new_subs} new</span>
          </div>
        );
      })}
    </div>
  );
}

export default function RevenueDashboardPage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<RevenueData>('/api/lms/admin/revenue')
      .then((d) => setData(d))
      .catch(() => setError('Failed to load revenue data.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen space-y-8 bg-background p-6 text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Revenue Intelligence</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            CARSI Pro · $795 AUD/year · computed from local subscription records
          </p>
        </div>
        <Link
          href="/admin"
          className="rounded-sm border border-border bg-background px-3 py-2 text-xs text-primary"
        >
          ← Admin
        </Link>
      </div>

      {loading && <p className="animate-pulse text-muted-foreground/50">Loading revenue data…</p>}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {data && (
        <>
          {/* Top row: 4 primary metrics */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard
              label="Monthly Recurring Revenue"
              value={formatAUD(data.mrr_aud)}
              sub="active subs / 12 × $795"
              accentClass="text-primary"
            />
            <MetricCard
              label="Annual Recurring Revenue"
              value={formatAUD(data.arr_aud)}
              sub="active subs × $795"
              accentClass="text-primary"
            />
            <MetricCard
              label="Active Subscribers"
              value={String(data.total_subscribers)}
              sub="status = active"
              accentClass="text-green-500"
            />
            <MetricCard
              label="Trial Conversion Rate"
              value={`${data.trial_to_paid_rate}%`}
              sub="trials → active"
              accentClass="text-amber-500"
            />
          </div>

          {/* Middle row: 2 secondary metrics */}
          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              label="Trialling Now"
              value={String(data.trialling)}
              sub="7-day free trial in progress"
              accentClass="text-primary"
            />
            <MetricCard
              label="Cancelled This Month"
              value={String(data.cancelled_this_month)}
              sub="cancelled_at in current month"
              accentClass="text-red-500"
            />
          </div>

          {/* Bottom: Revenue by Month bar chart */}
          <div className="rounded-sm border border-border bg-card p-6">
            <h2 className="mb-6 text-sm tracking-widest text-muted-foreground uppercase">
              Revenue by Month — Last 6 Months
            </h2>
            <RevenueBarChart data={data.revenue_by_month} />
          </div>
        </>
      )}
    </div>
  );
}
