'use client';

import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

type ContactRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  message: string;
  status: string;
  created_at: string;
};

export default function AdminContactsPage() {
  const [items, setItems] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/contacts');
      if (!res.ok) throw new Error('Failed to load');
      const data = (await res.json()) as { items: ContactRow[] };
      setItems(data.items ?? []);
    } catch {
      setError('Could not load contact submissions.');
    } finally {
      setLoading(false);
    }
  }, []);

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

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Contact inbox</h1>
        <p className="text-sm text-white/50">Messages from the public contact form</p>
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
