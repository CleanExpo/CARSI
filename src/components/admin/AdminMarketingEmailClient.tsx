'use client';

import { ImagePlus, Search, Send, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { adminGlassCard } from '@/components/admin/admin-learner-ui';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Customer = { id: string; email: string; fullName: string | null };

export function AdminMarketingEmailClient() {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Record<string, Customer>>({});
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadCustomers = useCallback(async (q: string) => {
    const params = q.trim().length >= 3 ? `?q=${encodeURIComponent(q.trim())}` : '';
    const res = await fetch(`/api/admin/marketing-email${params}`);
    const data = (await res.json().catch(() => ({}))) as { users?: Customer[]; detail?: string };
    if (!res.ok) {
      setError(data.detail || 'Could not load customers');
      return;
    }
    setCustomers(data.users ?? []);
  }, []);

  useEffect(() => {
    void loadCustomers('');
  }, [loadCustomers]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    await loadCustomers(query);
  }

  function toggle(user: Customer) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[user.id]) delete next[user.id];
      else next[user.id] = user;
      return next;
    });
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
          body,
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

  const selectedList = Object.values(selected);

  return (
    <div className="px-5 py-8 pb-20 sm:px-8 sm:py-10">
      <header className="mb-8 max-w-3xl space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-white">Marketing email</h1>
        <p className="text-sm text-white/55">
          Choose customers, write the subject and the message only. We add “Hi [name],” at the top
          and Phill’s signature at the bottom. Your text is formatted as proper paragraphs and
          bullet lists (blank line between paragraphs; lines starting with - for bullets). Use
          **double asterisks** for emphasis. Do not paste HTML.
        </p>
      </header>

      <div className="grid max-w-5xl gap-6 lg:grid-cols-[1fr_1.1fr]">
        <section className={cn(adminGlassCard, 'p-5')}>
          <h2 className="text-sm font-semibold text-white">Customers</h2>
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
          <ul className="mt-4 max-h-80 space-y-1 overflow-y-auto">
            {customers.map((u) => (
              <li key={u.id}>
                <label className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm text-white/85 hover:bg-white/5">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={Boolean(selected[u.id])}
                    onChange={() => toggle(u)}
                  />
                  <span>
                    <span className="block font-medium">{u.fullName || '—'}</span>
                    <span className="text-xs text-white/45">{u.email}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {selectedList.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedList.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggle(u)}
                  className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-white/80"
                >
                  {u.email}
                  <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          ) : null}
          <p className="mt-3 text-xs text-white/40">
            {selectedList.length} selected (max 80 per send)
          </p>
        </section>

        <section className={cn(adminGlassCard, 'space-y-4 p-5')}>
          <h2 className="text-sm font-semibold text-white">Message</h2>
          <label className="block text-sm text-white/70">
            Subject
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={120}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-sm text-white/70">
            Body (message only)
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              maxLength={8000}
              placeholder={
                'We have a new course date in Brisbane.\n\n- Level 3 mould remediation\n- Online, self-paced\n\nBook at https://carsi.com.au/courses'
              }
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            />
          </label>
          <div>
            <p className="text-sm text-white/70">Image (optional)</p>
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
          <Button type="button" onClick={() => void send()} disabled={sending}>
            <Send className="mr-2 h-4 w-4" />
            {sending ? 'Sending…' : `Send to ${selectedList.length || 0}`}
          </Button>
        </section>
      </div>
    </div>
  );
}
