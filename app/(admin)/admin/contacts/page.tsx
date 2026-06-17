'use client';

import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

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
    await fetch('/api/admin/contacts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    void load();
  }

  function handleLeadFilter(intent: string) {
    setLeadIntent(intent);
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Contact inbox</h1>
        <p className="text-sm text-white/50">
          Messages from the public contact form, including Start Smart lead routing context.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {LEAD_FILTERS.map((filter) => (
          <Button
            key={filter.value || 'all'}
            size="sm"
            variant={leadIntent === filter.value ? 'default' : 'outline'}
            className={leadIntent === filter.value ? '' : 'border-white/15 text-white/70'}
            onClick={() => handleLeadFilter(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {loading ? <p className="text-white/50">Loading…</p> : null}
      {error ? <p className="text-red-300">{error}</p> : null}

      <div className="space-y-3">
        {items.map((row) => (
          <article
            key={row.id}
            className="rounded-lg border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-white">
                  {row.first_name} {row.last_name}
                </p>
                <a href={`mailto:${row.email}`} className="text-sm text-[#2490ed]">
                  {row.email}
                </a>
                <p className="mt-1 text-xs text-white/40">
                  {new Date(row.created_at).toLocaleString('en-AU')}
                </p>
              </div>
              <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs text-white/60">
                {row.status}
              </span>
            </div>
            {row.lead_context && Object.keys(row.lead_context).length > 0 ? (
              <div className="mt-4 rounded-sm border border-[#2490ed]/25 bg-[#2490ed]/10 p-3">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#2490ed]/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#7ec5ff] uppercase">
                    Start Smart lead
                  </span>
                  {row.lead_context.intent ? (
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/60">
                      {formatLeadValue(row.lead_context.intent)}
                    </span>
                  ) : null}
                </div>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                  {[
                    ['Source', formatLeadValue(row.lead_context.source)],
                    ['Topic', row.lead_context.topic],
                    ['Pathway', formatLeadValue(row.lead_context.pathway)],
                    ['Source page', row.lead_context.page_url],
                  ]
                    .filter(([, value]) => Boolean(value))
                    .map(([label, value]) => (
                      <div key={label} className="rounded-sm bg-white/[0.04] px-3 py-2">
                        <p className="text-[10px] font-semibold tracking-wide text-white/35 uppercase">
                          {label}
                        </p>
                        <p className="mt-1 break-words text-xs leading-5 text-white/75">{value}</p>
                      </div>
                    ))}
                </div>
              </div>
            ) : null}
            <p className="mt-3 text-sm whitespace-pre-wrap text-white/70">{row.message}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(['read', 'replied', 'archived'] as const).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant="outline"
                  className="border-white/15 text-white/70"
                  onClick={() => void setStatus(row.id, s)}
                >
                  Mark {s}
                </Button>
              ))}
            </div>
          </article>
        ))}
        {!loading && items.length === 0 ? (
          <p className="text-white/45">No messages yet.</p>
        ) : null}
      </div>
    </div>
  );
}
