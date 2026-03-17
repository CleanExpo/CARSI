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
  accent = '#2490ed',
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div
      className="flex flex-col gap-1 rounded-sm p-5"
      style={{
        background: '#060a14',
        border: '0.5px solid rgba(255,255,255,0.06)',
      }}
    >
      <span className="font-mono text-xs tracking-widest text-white/40 uppercase">{label}</span>
      <span className="font-mono text-3xl font-bold" style={{ color: accent }}>
        {value}
      </span>
      {sub && <span className="font-mono text-xs text-white/30">{sub}</span>}
    </div>
  );
}

function RevenueBarChart({ data }: { data: RevenueByMonth[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center font-mono text-sm text-white/30">No subscription data yet.</p>
    );
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenue_aud), 1);

  return (
    <div className="flex h-40 w-full items-end gap-4">
      {data.map((row) => {
        const pct = (row.revenue_aud / maxRevenue) * 100;
        return (
          <div key={row.month} className="flex flex-1 flex-col items-center gap-2">
            <span className="font-mono text-xs text-white/40">{formatAUD(row.revenue_aud)}</span>
            <div className="flex w-full flex-col justify-end" style={{ height: '96px' }}>
              <div
                className="w-full rounded-sm transition-all"
                style={{
                  height: `${Math.max(pct, 3)}%`,
                  background: '#2490ed',
                  opacity: 0.85,
                  minHeight: '4px',
                }}
              />
            </div>
            <span className="font-mono text-xs text-white/30">{row.month}</span>
            <span className="font-mono text-xs text-white/20">{row.new_subs} new</span>
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
    <div className="min-h-screen space-y-8 p-6" style={{ background: '#050505', color: '#ffffff' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold tracking-tight">Revenue Intelligence</h1>
          <p className="mt-1 font-mono text-sm text-white/40">
            CARSI Pro · $795 AUD/year · computed from local subscription records
          </p>
        </div>
        <Link
          href="/admin"
          className="rounded-sm px-3 py-2 font-mono text-xs"
          style={{
            background: '#060a14',
            border: '0.5px solid rgba(255,255,255,0.06)',
            color: '#2490ed',
          }}
        >
          ← Admin
        </Link>
      </div>

      {loading && <p className="animate-pulse font-mono text-white/30">Loading revenue data…</p>}

      {error && <p className="font-mono text-sm text-red-400">{error}</p>}

      {data && (
        <>
          {/* Top row: 4 primary metrics */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard
              label="Monthly Recurring Revenue"
              value={formatAUD(data.mrr_aud)}
              sub="active subs / 12 × $795"
              accent="#2490ed"
            />
            <MetricCard
              label="Annual Recurring Revenue"
              value={formatAUD(data.arr_aud)}
              sub="active subs × $795"
              accent="#2490ed"
            />
            <MetricCard
              label="Active Subscribers"
              value={String(data.total_subscribers)}
              sub="status = active"
              accent="#00FF88"
            />
            <MetricCard
              label="Trial Conversion Rate"
              value={`${data.trial_to_paid_rate}%`}
              sub="trials → active"
              accent="#FFB800"
            />
          </div>

          {/* Middle row: 2 secondary metrics */}
          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              label="Trialling Now"
              value={String(data.trialling)}
              sub="7-day free trial in progress"
              accent="#2490ed"
            />
            <MetricCard
              label="Cancelled This Month"
              value={String(data.cancelled_this_month)}
              sub="cancelled_at in current month"
              accent="#FF4444"
            />
          </div>

          {/* Bottom: Revenue by Month bar chart */}
          <div
            className="rounded-sm p-6"
            style={{
              background: '#060a14',
              border: '0.5px solid rgba(255,255,255,0.06)',
            }}
          >
            <h2 className="mb-6 font-mono text-sm tracking-widest text-white/40 uppercase">
              Revenue by Month — Last 6 Months
            </h2>
            <RevenueBarChart data={data.revenue_by_month} />
          </div>
        </>
      )}
    </div>
  );
}
