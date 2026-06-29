'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Clock,
  Filter,
  Inbox,
  Mail,
  MessageSquare,
  Reply,
  Sparkles,
  User,
} from 'lucide-react';

import { adminGlassCard, formatAdminDateTime } from '@/components/admin/admin-learner-ui';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ContactRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  message: string;
  raw_message?: string;
  lead_context?: {
    source?: string;
    topic?: string;
    pathway?: string;
    intent?: string;
    page_url?: string;
  };
  status: string;
  created_at: string;
};

const LEAD_FILTERS = [
  { label: 'All leads', value: '' },
  { label: 'Course', value: 'course-enquiry' },
  { label: 'CCW workshop', value: 'ccw-workshop' },
  { label: 'Equipment/service', value: 'equipment-service-guidance' },
  { label: 'Team/buyer', value: 'team-or-buyer' },
] as const;

function formatLeadValue(value?: string) {
  return value?.replaceAll('-', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusStyle(status: string) {
  switch (status) {
    case 'replied':
      return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200';
    case 'read':
      return 'border-[#2490ed]/30 bg-[#2490ed]/10 text-[#7ec5ff]';
    case 'archived':
      return 'border-white/10 bg-white/5 text-white/45';
    default:
      return 'border-amber-400/30 bg-amber-400/10 text-amber-200';
  }
}

export default function AdminContactsPage() {
  const [items, setItems] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leadIntent, setLeadIntent] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (leadIntent) params.set('lead_intent', leadIntent);
      const res = await fetch(`/api/admin/contacts${params.toString() ? `?${params}` : ''}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = (await res.json()) as { items: ContactRow[] };
      setItems(data.items ?? []);
    } catch {
      setError('Could not load contact submissions.');
    } finally {
      setLoading(false);
    }
  }, [leadIntent]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(id: string, status: string) {
    setError(null);
    try {
      const res = await fetch('/api/admin/contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) {
        setError('Could not update contact status. Please try again.');
        return;
      }
      void load();
    } catch {
      setError('Could not update contact status. Please try again.');
    }
  }

  function handleLeadFilter(intent: string) {
    setLeadIntent(intent);
  }

  const stats = useMemo(() => {
    const unread = items.filter((i) => i.status === 'new' || i.status === 'unread').length;
    const read = items.filter((i) => i.status === 'read').length;
    const replied = items.filter((i) => i.status === 'replied').length;
    const smartLeads = items.filter((i) => i.lead_context && Object.keys(i.lead_context).length > 0).length;
    return { total: items.length, unread, read, replied, smartLeads };
  }, [items]);

  return (
    <div className="relative space-y-6 px-6 py-8">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 opacity-55"
        aria-hidden
        style={{
          background:
            'radial-gradient(700px 280px at 10% 0%, rgba(36, 144, 237, 0.14), transparent 58%), radial-gradient(500px 240px at 90% 5%, rgba(167, 139, 250, 0.08), transparent 55%)',
        }}
      />

      <header className={cn(adminGlassCard, 'overflow-hidden p-0')}>
        <div className="border-b border-white/[0.06] bg-gradient-to-br from-[#2490ed]/10 via-transparent to-transparent px-6 py-8 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#2490ed]/30 bg-[#2490ed]/10">
                <Inbox className="h-6 w-6 text-[#7ec5ff]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Contact inbox</h1>
                <p className="mt-1 max-w-xl text-sm text-white/50">
                  Messages from the public contact form, including Start Smart lead routing context.
                </p>
              </div>
            </div>
          </div>
        </div>
        {!loading && items.length > 0 ? (
          <div className="grid gap-px bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'In view', value: stats.total, icon: Inbox, accent: '#2490ed' },
              { label: 'Awaiting reply', value: stats.unread, icon: MessageSquare, accent: '#fb923c' },
              { label: 'Replied', value: stats.replied, icon: Reply, accent: '#34d399' },
              { label: 'Start Smart', value: stats.smartLeads, icon: Sparkles, accent: '#a78bfa' },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3 bg-black/20 px-5 py-4">
                <s.icon className="h-4 w-4 shrink-0" style={{ color: s.accent }} strokeWidth={1.75} />
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.14em] text-white/38 uppercase">{s.label}</p>
                  <p className="mt-0.5 text-xl font-bold tabular-nums text-white/90">{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </header>

      <div className={cn(adminGlassCard, 'p-4')}>
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-white/40 uppercase">
          <Filter className="h-3.5 w-3.5" />
          Filter by intent
        </div>
        <div className="flex flex-wrap gap-2">
          {LEAD_FILTERS.map((filter) => (
            <Button
              key={filter.value || 'all'}
              size="sm"
              variant={leadIntent === filter.value ? 'default' : 'outline'}
              className={
                leadIntent === filter.value
                  ? 'rounded-full bg-[#2490ed] shadow-md shadow-[#2490ed]/20'
                  : 'rounded-full border-white/12 text-white/65 hover:border-white/20 hover:bg-white/[0.04]'
              }
              onClick={() => handleLeadFilter(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className={cn(adminGlassCard, 'h-36 animate-pulse bg-white/[0.04]')} />
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
      ) : null}

      <div className="space-y-4">
        {items.map((row) => {
          const fullName = `${row.first_name} ${row.last_name}`.trim();
          const hasLeadContext = row.lead_context && Object.keys(row.lead_context).length > 0;
          return (
            <article
              key={row.id}
              className={cn(
                adminGlassCard,
                'overflow-hidden p-0 transition-[border-color,box-shadow] hover:border-white/[0.12]',
              )}
            >
              <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[#7ec5ff]">
                      <User className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-white">{fullName || 'Unknown sender'}</p>
                      <a
                        href={`mailto:${row.email}`}
                        className="inline-flex items-center gap-1.5 text-sm text-[#2490ed] hover:underline"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        {row.email}
                      </a>
                      <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-white/40">
                        <Clock className="h-3 w-3" />
                        {formatAdminDateTime(row.created_at)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase',
                      statusStyle(row.status),
                    )}
                  >
                    {row.status}
                  </span>
                </div>
              </div>

              {hasLeadContext ? (
                <div className="border-b border-white/[0.05] bg-[#2490ed]/[0.04] px-5 py-4 sm:px-6">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2490ed]/30 bg-[#2490ed]/15 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-[#7ec5ff] uppercase">
                      <Sparkles className="h-3 w-3" />
                      Start Smart lead
                    </span>
                    {row.lead_context?.intent ? (
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/60">
                        {formatLeadValue(row.lead_context.intent)}
                      </span>
                    ) : null}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      ['Source', formatLeadValue(row.lead_context?.source)],
                      ['Topic', row.lead_context?.topic],
                      ['Pathway', formatLeadValue(row.lead_context?.pathway)],
                      ['Source page', row.lead_context?.page_url],
                    ]
                      .filter(([, value]) => Boolean(value))
                      .map(([label, value]) => (
                        <div
                          key={label}
                          className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5"
                        >
                          <p className="text-[10px] font-semibold tracking-wide text-white/35 uppercase">{label}</p>
                          <p className="mt-1 break-words text-xs leading-5 text-white/75">{value}</p>
                        </div>
                      ))}
                  </div>
                </div>
              ) : null}

              <div className="px-5 py-4 sm:px-6">
                <p className="mb-1 text-[10px] font-semibold tracking-[0.14em] text-white/35 uppercase">Message</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-white/72">{row.message}</p>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-white/[0.06] bg-black/15 px-5 py-3 sm:px-6">
                {(['read', 'replied', 'archived'] as const).map((s) => {
                  const Icon = s === 'read' ? Mail : s === 'replied' ? Reply : Archive;
                  return (
                    <Button
                      key={s}
                      size="sm"
                      variant="outline"
                      className="rounded-full border-white/12 text-white/65 hover:bg-white/[0.05]"
                      onClick={() => void setStatus(row.id, s)}
                    >
                      <Icon className="mr-1.5 h-3.5 w-3.5" />
                      Mark {s}
                    </Button>
                  );
                })}
              </div>
            </article>
          );
        })}

        {!loading && items.length === 0 ? (
          <div className={cn(adminGlassCard, 'flex flex-col items-center justify-center gap-3 py-20 text-center')}>
            <Inbox className="h-12 w-12 text-white/15" />
            <p className="text-sm font-medium text-white/55">No messages yet</p>
            <p className="max-w-sm text-xs text-white/38">
              Contact form submissions will appear here with lead context when available.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
