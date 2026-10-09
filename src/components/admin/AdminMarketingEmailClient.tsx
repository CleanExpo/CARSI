'use client';

import { ChevronLeft, ChevronRight, ImagePlus, Search, Send, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { adminGlassCard } from '@/components/admin/admin-learner-ui';
import {
    MarketingComposeEditor,
    type MarketingComposeValue,
} from '@/components/admin/MarketingComposeEditor';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Customer = { id: string; email: string; fullName: string | null };

type ListResponse = {
  users: Customer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  cappedSelectAll: number;
};

const PAGE_SIZES = [25, 50, 80] as const;
const MAX_SEND = 80;

export function AdminMarketingEmailClient() {
  const [query, setQuery] = useState('');
  const [list, setList] = useState<ListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(25);
  const [selected, setSelected] = useState<Record<string, Customer>>({});
  const [subject, setSubject] = useState('');
  const [compose, setCompose] = useState<MarketingComposeValue>({ html: '', text: '' });
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadCustomers = useCallback(async (opts: { q: string; page: number; pageSize: number }) => {
    setLoadingList(true);
    const params = new URLSearchParams({
      page: String(opts.page),
      pageSize: String(opts.pageSize),
    });
    if (opts.q.trim().length >= 3) params.set('q', opts.q.trim());
    const res = await fetch(`/api/admin/marketing-email?${params}`);
    const data = (await res.json().catch(() => ({}))) as ListResponse & { detail?: string };
    setLoadingList(false);
    if (!res.ok) {
      setError(data.detail || 'Could not load customers');
      return;
    }
    setList(data);
  }, []);

  useEffect(() => {
    void loadCustomers({ q: query, page, pageSize });
  }, [loadCustomers, query, page, pageSize]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setPage(1);
    await loadCustomers({ q: query, page: 1, pageSize });
  }

  function toggle(user: Customer) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[user.id]) delete next[user.id];
      else {
        if (Object.keys(next).length >= MAX_SEND) {
          setError(`You can select at most ${MAX_SEND} customers per send.`);
          return prev;
        }
        next[user.id] = user;
      }
      setError('');
      return next;
    });
  }

  function selectAllOnPage() {
    if (!list?.users.length) return;
    setSelected((prev) => {
      const next = { ...prev };
      for (const u of list.users) {
        if (Object.keys(next).length >= MAX_SEND) break;
        next[u.id] = u;
      }
      return next;
    });
  }

  function clearSelection() {
    setSelected({});
  }

  async function selectAllMatching() {
    setError('');
    const params = new URLSearchParams({ selectAll: '1' });
    if (query.trim().length >= 3) params.set('q', query.trim());
    const res = await fetch(`/api/admin/marketing-email?${params}`);
    const data = (await res.json().catch(() => ({}))) as {
      users?: Customer[];
      total?: number;
      cappedSelectAll?: number;
      detail?: string;
    };
    if (!res.ok || !data.users) {
      setError(data.detail || 'Could not select all');
      return;
    }
    const next: Record<string, Customer> = {};
    for (const u of data.users) next[u.id] = u;
    setSelected(next);
    if ((data.total ?? 0) > MAX_SEND) {
      setSuccess(
        `Selected first ${data.users.length} of ${data.total} matching customers (send limit ${MAX_SEND}).`
      );
    }
  }

  async function onUpload(file: File) {
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.set('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: form });
      const data = (await res.json().catch(() => ({}))) as { url?: string; detail?: string };
      if (!res.ok || !data.url) {
        setError(data.detail || 'Image upload failed');
        return;
      }
      setImageUrl(data.url);
    } finally {
      setUploading(false);
    }
  }

  async function send() {
    const ids = Object.keys(selected);
    if (ids.length === 0) {
      setError('Select at least one customer.');
      return;
    }
    if (!compose.text.trim() && !compose.html.trim()) {
      setError('Write the email body.');
      return;
    }
    setSending(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/marketing-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: ids,
          subject,
          body: compose.text,
          bodyHtml: compose.html || undefined,
          imageUrl: imageUrl || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        detail?: string;
        sent?: number;
        skippedOptOut?: number;
        failed?: number;
      };
      if (!res.ok) {
        setError(data.detail || 'Send failed');
        return;
      }
      setSuccess(
        `Sent ${data.sent ?? 0}. Skipped opted-out: ${data.skippedOptOut ?? 0}. Failed: ${data.failed ?? 0}.`
      );
    } finally {
      setSending(false);
    }
  }

  const selectedList = useMemo(() => Object.values(selected), [selected]);
  const rangeStart = list ? (list.page - 1) * list.pageSize + 1 : 0;
  const rangeEnd = list ? Math.min(list.total, list.page * list.pageSize) : 0;

  const sendLabel = sending
    ? 'Sending…'
    : selectedList.length > 0
      ? `Send to ${selectedList.length}`
      : 'Send';

  return (
    <div className="px-5 py-8 pb-20 sm:px-8 sm:py-10">
      <header className="mb-8 max-w-4xl space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-white">Marketing email</h1>
        <p className="text-sm text-white/55">
          Gmail-style compose: paste formatted text, add links, pick customers in batches. We add Hi
          [name] and Phill&apos;s signature automatically.
        </p>
      </header>

      <div className="grid max-w-6xl gap-6 xl:grid-cols-[minmax(320px,1fr)_minmax(380px,1.2fr)]">
        <section className={cn(adminGlassCard, 'order-2 flex flex-col p-5 xl:order-1')}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">Customers</h2>
            {list ? (
              <p className="text-xs text-white/45">
                {list.total} eligible · showing {rangeStart}–{rangeEnd}
              </p>
            ) : null}
          </div>

          <form onSubmit={(e) => void search(e)} className="mt-3 flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or email (3+ letters)"
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35"
            />
            <Button type="submit" variant="secondary" size="sm">
              <Search className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={selectAllOnPage}
              className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/85 hover:bg-white/10"
            >
              Select page
            </button>
            <button
              type="button"
              onClick={() => void selectAllMatching()}
              className="rounded-lg border border-[#2490ed]/40 bg-[#2490ed]/15 px-2.5 py-1 text-xs font-medium text-sky-100 hover:bg-[#2490ed]/25"
            >
              Select all matching (max {MAX_SEND})
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-white/55 hover:text-white"
            >
              Clear
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/45">
            <span>Batch size</span>
            {PAGE_SIZES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setPageSize(n);
                  setPage(1);
                }}
                className={cn(
                  'rounded-md px-2 py-0.5',
                  pageSize === n ? 'bg-white/15 text-white' : 'hover:bg-white/8'
                )}
              >
                {n}
              </button>
            ))}
          </div>

          <ul className="mt-3 min-h-[200px] flex-1 space-y-0.5 overflow-y-auto rounded-lg border border-white/8 bg-black/20 p-1">
            {loadingList ? (
              <li className="px-3 py-6 text-center text-sm text-white/40">Loading…</li>
            ) : null}
            {!loadingList && list?.users.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-white/40">No customers found.</li>
            ) : null}
            {list?.users.map((u) => (
              <li key={u.id}>
                <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 text-sm text-white/90 hover:bg-white/5">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 rounded border-white/20"
                    checked={Boolean(selected[u.id])}
                    onChange={() => toggle(u)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{u.fullName || '—'}</span>
                    <span className="block truncate text-xs text-white/45">{u.email}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>

          {list && list.totalPages > 1 ? (
            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs text-white/70 disabled:opacity-30"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </button>
              <span className="text-xs text-white/45">
                Page {list.page} of {list.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= list.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs text-white/70 disabled:opacity-30"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}

          {selectedList.length > 0 ? (
            <div className="mt-3 max-h-24 overflow-y-auto">
              <div className="flex flex-wrap gap-1.5">
                {selectedList.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggle(u)}
                    className="inline-flex max-w-full items-center gap-1 truncate rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-white/80"
                  >
                    <span className="truncate">{u.email}</span>
                    <X className="h-3 w-3 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <p className="mt-2 text-xs font-medium text-white/50">
            {selectedList.length} selected · max {MAX_SEND} per send
          </p>
        </section>

        <section
          className={cn(
            adminGlassCard,
            'order-1 flex flex-col overflow-hidden p-0 xl:order-2 xl:sticky xl:top-0 xl:max-h-[calc(100dvh-2rem)] xl:self-start'
          )}
        >
          <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[rgba(10,14,28,0.96)] px-5 py-4 backdrop-blur-sm">
            <div>
              <h2 className="text-sm font-semibold text-white">Compose</h2>
              <p className="mt-0.5 text-xs text-white/45">
                {selectedList.length > 0
                  ? `${selectedList.length} recipient${selectedList.length === 1 ? '' : 's'} selected`
                  : 'Select customers in the list below or on the left'}
              </p>
            </div>
            <Button
              type="button"
              variant="gradient"
              size="lg"
              className="shrink-0 shadow-lg"
              onClick={() => void send()}
              disabled={sending}
            >
              <Send className="h-4 w-4" />
              {sendLabel}
            </Button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <label className="block text-sm text-white/70">
            Subject
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={120}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            />
          </label>
          <div>
            <p className="mb-1 text-sm text-white/70">Body</p>
            <MarketingComposeEditor value={compose} onChange={setCompose} />
          </div>
          <div>
            <p className="text-sm text-white/70">Hero image (optional)</p>
            <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80">
              <ImagePlus className="h-4 w-4" />
              {uploading ? 'Uploading…' : 'Upload JPEG, PNG, WebP or GIF'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onUpload(file);
                }}
              />
            </label>
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt=""
                className="mt-3 max-h-40 rounded-lg border border-white/10"
              />
            ) : null}
          </div>
          {error ? <p className="text-sm text-amber-300">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-300">{success}</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
