'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ASK_COACH_ANSWER_MAX } from '@/lib/coaching-portal/ask-my-coach';
import type { CoachInboxView } from '@/lib/server/carsi-coaching-ask-coach';

const ENDPOINT = '/api/admin/coaching/questions';

const surface =
  'rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]';
const btn =
  'inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/85 hover:bg-white/10 disabled:opacity-40';

/**
 * GP-630 coach inbox: questions members asked that the coach's material did not cover.
 * Each answer is saved once and shows in the member's portal and on their action board.
 */
export function AdminCoachingQuestionsClient() {
  const [questions, setQuestions] = useState<CoachInboxView[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      const res = await fetch(ENDPOINT);
      if (res.status === 404) {
        setError('Ask my coach is turned off (CARSI_COACHING_ASSISTANT_ENABLED).');
        return;
      }
      if (!res.ok) {
        setError('Could not load coach questions.');
        return;
      }
      const data = (await res.json()) as { questions: CoachInboxView[] };
      setQuestions(data.questions);
    })();
  }, []);

  async function answer(id: string) {
    const text = (drafts[id] ?? '').trim();
    if (!text) return;
    setBusyId(id);
    setNotice('');
    setError('');
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, answer: text }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        detail?: string;
        questions?: CoachInboxView[];
      };
      if (!res.ok) {
        setError(data.detail ?? 'Could not save the answer.');
        if (res.status === 409) setQuestions((q) => (q ?? []).filter((x) => x.id !== id));
        return;
      }
      setQuestions(data.questions ?? []);
      setNotice('Answer sent. The member sees it in their portal.');
    } catch {
      setError('Could not save the answer.');
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <header>
        <p className="text-[11px] font-semibold tracking-[0.18em] text-sky-400/90 uppercase">
          Ask my coach
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Coach questions</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
          Questions members asked between sessions that your material did not cover. Each one is
          answered once, and the member sees your answer in their coaching portal.
        </p>
      </header>

      {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      {questions === null && !error ? (
        <p className="flex items-center gap-2 text-sm text-white/60">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading
        </p>
      ) : null}

      {questions?.length === 0 ? (
        <p className={`${surface} p-5 text-sm text-white/60`}>No open questions.</p>
      ) : null}

      {questions?.map((q) => (
        <section key={q.id} className={`${surface} p-5`}>
          <p className="text-xs text-white/50">
            {q.memberLabel} ·{' '}
            {new Date(q.askedAt).toLocaleString('en-AU', {
              day: 'numeric',
              month: 'short',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
          <p className="mt-2 text-base font-medium text-white">{q.question}</p>
          <label className="mt-4 block">
            <span className="text-xs font-medium text-white/60">Your answer</span>
            <textarea
              rows={4}
              maxLength={ASK_COACH_ANSWER_MAX}
              value={drafts[q.id] ?? ''}
              onChange={(e) => setDrafts((d) => ({ ...d, [q.id]: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-sky-400/50 focus:outline-none"
            />
          </label>
          <button
            type="button"
            className={`mt-3 ${btn}`}
            disabled={busyId === q.id || !(drafts[q.id] ?? '').trim()}
            onClick={() => void answer(q.id)}
          >
            {busyId === q.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Send answer
          </button>
        </section>
      ))}
    </div>
  );
}
