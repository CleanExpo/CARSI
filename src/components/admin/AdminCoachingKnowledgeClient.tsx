'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useState, type ChangeEvent } from 'react';

import {
  COACH_CORPUS_BODY_MAX,
  COACH_CORPUS_SOURCE_TYPES,
  COACH_CORPUS_TITLE_MAX,
  type CoachCorpusSourceType,
} from '@/lib/coaching-portal/coach-corpus';
import type { CoachCorpusItemView } from '@/lib/server/carsi-coaching-coach-corpus';

const ENDPOINT = '/api/admin/coaching/corpus';
/** Plain-text files only in this slice; PDF and Word come later. */
const FILE_ACCEPT = '.txt,.md,text/plain,text/markdown';
const FILE_MAX_BYTES = 1_000_000;

const surface =
  'rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]';
const btn =
  'inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/85 hover:bg-white/10 disabled:opacity-40';
const field =
  'mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-sky-400/50 focus:outline-none';

const EMPTY_FORM = {
  sourceType: 'transcript' as CoachCorpusSourceType,
  title: '',
  provenanceUrl: '',
  body: '',
};

/**
 * GP-631 coach knowledge base: the coach's own podcasts, chapters, newsletters, frameworks
 * and SOPs. Nothing is used by Ask my coach until the coach approves it, and removing an item
 * stops it being used straight away.
 */
export function AdminCoachingKnowledgeClient() {
  const [items, setItems] = useState<CoachCorpusItemView[] | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [off, setOff] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch(ENDPOINT);
      if (res.status === 404) {
        setOff(true);
        return;
      }
      if (!res.ok) {
        setError('Could not load your knowledge base.');
        return;
      }
      const data = (await res.json()) as { items: CoachCorpusItemView[] };
      setItems(data.items);
    })();
  }, []);

  async function send(key: string, url: string, init: RequestInit, success: string) {
    setBusy(key);
    setNotice('');
    setError('');
    try {
      const res = await fetch(url, init);
      const data = (await res.json().catch(() => ({}))) as {
        detail?: string;
        items?: CoachCorpusItemView[];
      };
      if (!res.ok) {
        setError(data.detail ?? 'Something went wrong. Please try again.');
        return false;
      }
      setItems(data.items ?? []);
      setNotice(success);
      return true;
    } catch {
      setError('Something went wrong. Please try again.');
      return false;
    } finally {
      setBusy('');
    }
  }

  async function add() {
    const ok = await send(
      'add',
      ENDPOINT,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      },
      'Added. Read it through, then approve it so Ask my coach can use it.'
    );
    if (ok) setForm(EMPTY_FORM);
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > FILE_MAX_BYTES) {
      setError('That file is too large. Split it into chapters or episodes.');
      return;
    }
    const text = await file.text();
    setForm((f) => ({ ...f, body: text, title: f.title || file.name.replace(/\.(txt|md)$/i, '') }));
    setError('');
  }

  function exportAll() {
    const blob = new Blob([JSON.stringify(items ?? [], null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'coach-knowledge-base.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (off) {
    return (
      <div className="mx-auto w-full max-w-4xl p-6">
        <p className={`${surface} p-5 text-sm text-white/60`}>
          Ask my coach is turned off (CARSI_COACHING_ASSISTANT_ENABLED).
        </p>
      </div>
    );
  }

  const canAdd = form.title.trim() && form.body.trim() && busy === '';

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <header>
        <p className="text-[11px] font-semibold tracking-[0.18em] text-sky-400/90 uppercase">
          Ask my coach
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
          Your knowledge base
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
          Add your own podcast transcripts, book chapters, newsletters, frameworks and SOPs. Once
          you approve an item, Ask my coach quotes it to your members word for word, with your item
          named as the source. Until you approve something, members are answered from CARSI&apos;s
          published coaching material. Your material is yours: only your members are answered from
          it, and you can export or remove it at any time.
        </p>
      </header>

      {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <section className={`${surface} space-y-4 p-5`}>
        <h2 className="text-base font-semibold text-white">Add material</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-white/60">Kind of material</span>
            <select
              value={form.sourceType}
              onChange={(e) =>
                setForm((f) => ({ ...f, sourceType: e.target.value as CoachCorpusSourceType }))
              }
              className={field}
            >
              {Object.entries(COACH_CORPUS_SOURCE_TYPES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-white/60">Title</span>
            <input
              value={form.title}
              maxLength={COACH_CORPUS_TITLE_MAX}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Episode 12: pricing carpet jobs"
              className={field}
            />
          </label>
        </div>
        <label className="block">
          <span className="text-xs font-medium text-white/60">Source link (optional)</span>
          <input
            type="url"
            value={form.provenanceUrl}
            onChange={(e) => setForm((f) => ({ ...f, provenanceUrl: e.target.value }))}
            placeholder="https://"
            className={field}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-white/60">
            Text (paste it, or load a .txt or .md file)
          </span>
          <textarea
            rows={10}
            maxLength={COACH_CORPUS_BODY_MAX}
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            className={field}
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <label className={`${btn} cursor-pointer`}>
            Load a file
            <input type="file" accept={FILE_ACCEPT} onChange={onFile} className="sr-only" />
          </label>
          <button type="button" className={btn} disabled={!canAdd} onClick={() => void add()}>
            {busy === 'add' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Add to knowledge base
          </button>
        </div>
        <p className="text-xs text-white/45">
          Text copied from an IICRC standard is refused. Paragraphs about certification, CEC or CPD
          are never quoted to members; those questions always come to you.
        </p>
      </section>

      {items === null && !error ? (
        <p className="flex items-center gap-2 text-sm text-white/60">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading
        </p>
      ) : null}

      {items?.length === 0 ? (
        <p className={`${surface} p-5 text-sm text-white/60`}>Nothing added yet.</p>
      ) : null}

      {items && items.length > 0 ? (
        <div className="flex justify-end">
          <button type="button" className={btn} onClick={exportAll}>
            Export my material
          </button>
        </div>
      ) : null}

      {items?.map((item) => (
        <section key={item.id} className={`${surface} p-5`}>
          <p className="text-xs text-white/50">
            {item.sourceTypeLabel} ·{' '}
            {item.approvedAt ? (
              <span className="text-emerald-300">In use</span>
            ) : (
              <span className="text-amber-300">Waiting for your approval</span>
            )}
          </p>
          <p className="mt-2 text-base font-medium text-white">{item.title}</p>
          {item.provenanceUrl ? (
            <a
              href={item.provenanceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-sky-300 underline-offset-2 hover:underline"
            >
              {item.provenanceUrl}
            </a>
          ) : null}
          <p className="mt-3 line-clamp-4 text-sm whitespace-pre-line text-white/70">{item.body}</p>
          <p className="mt-3 text-xs text-white/45">
            {item.passageCount} {item.passageCount === 1 ? 'passage' : 'passages'}
            {item.heldBackCount > 0
              ? `, ${item.heldBackCount} held back because ${item.heldBackCount === 1 ? 'it mentions' : 'they mention'} certification, CEC or CPD topics`
              : ''}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {!item.approvedAt ? (
              <button
                type="button"
                className={btn}
                disabled={busy !== ''}
                onClick={() =>
                  void send(
                    item.id,
                    `${ENDPOINT}/${item.id}`,
                    {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'approve' }),
                    },
                    'Approved. Ask my coach can now quote it to your members.'
                  )
                }
              >
                {busy === item.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Approve
              </button>
            ) : null}
            <button
              type="button"
              className={btn}
              disabled={busy !== ''}
              onClick={() => {
                if (!window.confirm(`Remove "${item.title}"? Ask my coach stops using it now.`)) {
                  return;
                }
                void send(
                  `rm-${item.id}`,
                  `${ENDPOINT}/${item.id}`,
                  { method: 'DELETE' },
                  'Removed. Ask my coach no longer uses it.'
                );
              }}
            >
              Remove
            </button>
          </div>
        </section>
      ))}
    </div>
  );
}
