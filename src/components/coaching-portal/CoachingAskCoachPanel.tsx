'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { CoachingTextArea } from '@/components/coaching-portal/coaching-form-primitives';
import {
  coachingCard,
  coachingCardTitle,
  coachingEyebrow,
  coachingMuted,
  coachingPrimaryBtn,
} from '@/components/coaching-portal/coaching-ui';
import { useCoachingPortal } from '@/components/coaching-portal/CoachingPortalContext';
import {
  ASK_COACH_COPY,
  ASK_COACH_QUESTION_MAX,
  ASK_COACH_QUESTION_MIN,
} from '@/lib/coaching-portal/ask-my-coach';
import type { AskMyCoachResult, MemberQuestionView } from '@/lib/server/carsi-coaching-ask-coach';

const ENDPOINT = '/api/coaching/portal/ask-coach';

/**
 * GP-630 "Ask my coach". Renders nothing until the API answers 200, so it stays hidden
 * while the feature flag is off (404) or the member has no active subscription (403).
 */
export function CoachingAskCoachPanel({ className = '' }: { className?: string }) {
  const { access } = useCoachingPortal();
  const [available, setAvailable] = useState(false);
  const [staffPreviewBlocked, setStaffPreviewBlocked] = useState(false);
  const [questions, setQuestions] = useState<MemberQuestionView[]>([]);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState<AskMyCoachResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(ENDPOINT)
      .then(async (res) => {
        if (cancelled) return;
        if (res.ok) {
          const data = (await res.json()) as { questions?: MemberQuestionView[] };
          setQuestions(data.questions ?? []);
          setAvailable(true);
          return;
        }
        if (access.mode === 'staff_preview' && res.status === 403) {
          setStaffPreviewBlocked(true);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [access.mode]);

  if (staffPreviewBlocked) {
    return (
      <section className={`${coachingCard} ${className}`}>
        <p className={coachingEyebrow}>Ask my coach</p>
        <h2 className={`mt-1 ${coachingCardTitle}`}>Subscriber feature</h2>
        <p className={`mt-2 ${coachingMuted}`}>
          Staff preview can browse the workspace, but Ask my coach needs an active coaching
          subscription — the same gate paying members hit.
        </p>
      </section>
    );
  }

  if (!available) return null;

  const trimmed = question.trim();
  const canAsk =
    access.canEdit &&
    !asking &&
    trimmed.length >= ASK_COACH_QUESTION_MIN &&
    trimmed.length <= ASK_COACH_QUESTION_MAX;

  async function ask() {
    if (!canAsk) return;
    setAsking(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        detail?: string;
        result?: AskMyCoachResult;
        questions?: MemberQuestionView[];
      };
      if (!res.ok || !data.result) {
        setError(data.detail ?? ASK_COACH_COPY.error);
        return;
      }
      setResult(data.result);
      setQuestions(data.questions ?? []);
      if (data.result.status !== 'answered') setQuestion('');
    } catch {
      setError(ASK_COACH_COPY.error);
    } finally {
      setAsking(false);
    }
  }

  return (
    <section className={`${coachingCard} ${className}`} aria-labelledby="ask-my-coach-title">
      <p className={coachingEyebrow}>{ASK_COACH_COPY.eyebrow}</p>
      <h2 id="ask-my-coach-title" className={`mt-1 ${coachingCardTitle}`}>
        {ASK_COACH_COPY.title}
      </h2>
      <p className={`mt-2 max-w-2xl ${coachingMuted}`}>{ASK_COACH_COPY.intro}</p>

      <div className="mt-4">
        <CoachingTextArea
          label="Your question"
          rows={3}
          value={question}
          disabled={!access.canEdit || asking}
          placeholder={ASK_COACH_COPY.placeholder}
          onChange={setQuestion}
        />
      </div>
      <button
        type="button"
        className={`mt-3 gap-2 ${coachingPrimaryBtn}`}
        disabled={!canAsk}
        onClick={() => void ask()}
      >
        {asking ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        {ASK_COACH_COPY.submit}
      </button>

      <div aria-live="polite">
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        {result ? <AskResult result={result} /> : null}
      </div>

      {questions.length > 0 ? (
        <div className="mt-6 border-t border-white/[0.08] pt-5">
          <h3 className="text-sm font-semibold text-slate-300">{ASK_COACH_COPY.historyTitle}</h3>
          <ul className="mt-3 space-y-3">
            {questions.map((q) => (
              <li key={q.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-sm font-medium text-white">{q.question}</p>
                {q.coachAnswer ? (
                  <>
                    <p className="mt-2 text-xs font-semibold tracking-wide text-sky-400/90">
                      {ASK_COACH_COPY.coachAnswered}
                    </p>
                    <p className="mt-1 text-sm whitespace-pre-line text-slate-200">
                      {q.coachAnswer}
                    </p>
                  </>
                ) : (
                  <p className={`mt-2 text-xs ${coachingMuted}`}>{ASK_COACH_COPY.waiting}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function AskResult({ result }: { result: AskMyCoachResult }) {
  if (result.status === 'answered') {
    return (
      <div className="mt-5 rounded-lg border border-sky-400/20 bg-sky-400/[0.04] p-4">
        <p className="text-xs font-semibold tracking-wide text-sky-400/90">
          {ASK_COACH_COPY.answeredLead}
        </p>
        <div className="mt-3 space-y-4">
          {result.passages.map((p) => {
            const source = result.citations.find((c) => c.itemId === p.itemId);
            return (
              <div key={p.itemId}>
                <p className="text-sm font-semibold text-white">{p.title}</p>
                <p className="mt-1 text-sm text-slate-200">{p.text}</p>
                {source ? (
                  <p className="mt-1 text-xs text-slate-400">
                    Source:{' '}
                    <Link
                      href={source.sourceHref}
                      className="text-sky-300 underline-offset-2 hover:underline"
                    >
                      {source.sourceLabel}
                    </Link>
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  if (result.status === 'sent_to_coach') {
    return (
      <p className="mt-5 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-200">
        {result.reason === 'compliance_topic'
          ? ASK_COACH_COPY.complianceSentToCoach
          : ASK_COACH_COPY.sentToCoach}
      </p>
    );
  }
  if (result.status === 'no_coach') {
    return <p className="mt-5 text-sm text-amber-200">{ASK_COACH_COPY.noCoach}</p>;
  }
  return null;
}
