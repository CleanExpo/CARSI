'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, CheckCircle2, Radio, XCircle } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { adminGlassCard } from '@/components/admin/admin-learner-ui';
import { cn } from '@/lib/utils';

interface CrmEventRow {
  id: string;
  event_type: string;
  status: string;
  response_status: number | null;
  created_at: string;
}

const chartTooltipProps = {
  contentStyle: {
    backgroundColor: 'rgba(10, 14, 26, 0.97)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    padding: '10px 14px',
  },
  itemStyle: { color: 'rgba(255, 255, 255, 0.95)', fontSize: 13 },
} as const;

function statusTone(status: string) {
  if (status === 'delivered') return { color: '#34d399', icon: CheckCircle2, label: 'Delivered' };
  if (status === 'failed') return { color: '#f87171', icon: XCircle, label: 'Failed' };
  return { color: 'rgba(255,255,255,0.45)', icon: Radio, label: status };
}

function formatEventType(type: string) {
  return type.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AdminCrmEvents() {
  const [items, setItems] = useState<CrmEventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/crm/events?limit=40', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setItems(d.items ?? []))
      .finally(() => setLoading(false));
  }, []);

  const statusBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of items) {
      counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
    }
    const colors: Record<string, string> = {
      delivered: '#34d399',
      failed: '#f87171',
      pending: '#fb923c',
    };
    return [...counts.entries()].map(([name, value]) => ({
      name,
      value,
      fill: colors[name] ?? '#2490ed',
    }));
  }, [items]);

  const deliveredCount = items.filter((i) => i.status === 'delivered').length;
  const failedCount = items.filter((i) => i.status === 'failed').length;

  if (loading) {
    return (
      <div className={cn(adminGlassCard, 'h-48 animate-pulse bg-white/[0.04]')} />
    );
  }

  if (items.length === 0) {
    return (
      <div className={cn(adminGlassCard, 'flex flex-col items-center justify-center gap-3 py-16 text-center')}>
        <Activity className="h-10 w-10 text-white/20" />
        <p className="text-sm text-white/50">
          No CRM events yet. Set <code className="rounded bg-white/10 px-1.5 py-0.5 text-white/70">CRM_WEBHOOK_URL</code>{' '}
          to sync contact and enrollment activity.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-12">
      <div className="grid gap-4 sm:grid-cols-3 xl:col-span-4">
        <div className={cn(adminGlassCard, 'p-4')}>
          <p className="text-[10px] font-semibold tracking-[0.14em] text-white/38 uppercase">Events logged</p>
          <p className="mt-2 text-2xl font-bold text-white">{items.length}</p>
        </div>
        <div className={cn(adminGlassCard, 'p-4')}>
          <p className="text-[10px] font-semibold tracking-[0.14em] text-emerald-400/80 uppercase">Delivered</p>
          <p className="mt-2 text-2xl font-bold text-emerald-300">{deliveredCount}</p>
        </div>
        <div className={cn(adminGlassCard, 'p-4')}>
          <p className="text-[10px] font-semibold tracking-[0.14em] text-red-300/80 uppercase">Failed</p>
          <p className="mt-2 text-2xl font-bold text-red-300">{failedCount}</p>
        </div>
      </div>

      {statusBreakdown.length > 1 ? (
        <div className={cn(adminGlassCard, 'flex items-center justify-center p-4 xl:col-span-3')}>
          <div className="h-[140px] w-full max-w-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={58}
                  paddingAngle={4}
                  stroke="none"
                >
                  {statusBreakdown.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip {...chartTooltipProps} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      <div className={cn(adminGlassCard, 'overflow-hidden xl:col-span-12', statusBreakdown.length > 1 ? '' : 'xl:col-span-8')}>
        <div className="relative">
          <div className="absolute left-[23px] top-0 bottom-0 w-px bg-gradient-to-b from-[#2490ed]/40 via-white/10 to-transparent" />
          <ul className="divide-y divide-white/[0.05]">
            {items.map((row) => {
              const tone = statusTone(row.status);
              const Icon = tone.icon;
              return (
                <li key={row.id} className="relative flex gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02]">
                  <div
                    className="relative z-[1] mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#0a0e1a]"
                    style={{ color: tone.color }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-white/85">{formatEventType(row.event_type)}</span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                        style={{
                          background: `${tone.color}18`,
                          color: tone.color,
                          border: `1px solid ${tone.color}33`,
                        }}
                      >
                        {tone.label}
                      </span>
                      {row.response_status != null ? (
                        <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-white/45">
                          HTTP {row.response_status}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-white/40">
                      {new Date(row.created_at).toLocaleString('en-AU', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
