'use client';

import { useState } from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { dash } from '@/lib/dashboard-light-ui';
import { cn } from '@/lib/utils';

interface QuizOption {
  text: string;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: QuizOption[];
  order_index: number;
  points: number;
}

interface Quiz {
  id: string;
  title: string;
  pass_percentage: number;
  time_limit_minutes: number | null;
  attempts_allowed: number;
  attempts_used?: number;
  questions: QuizQuestion[];
}

interface QuizPlayerProps {
  quiz: Quiz;
  /**
   * May be sync or async. When it returns a promise the submit button stays disabled until it
   * settles, which is what makes the double-submit guard below correct rather than cosmetic.
   */
  onSubmit: (answers: Record<string, number>) => void | Promise<void>;
  variant?: 'default' | 'enterprise';
}

/**
 * Run a submit under a re-entry lock, and ALWAYS release the lock.
 *
 * The release MUST be in `finally`, not `catch`. An earlier version released only on a thrown
 * error, which never happened: the real caller (`LearnCourseShell.submitQuiz`) catches its own
 * API failure, calls `setLessonError`, and RESOLVES. So a failed submit left the lock set and
 * both submit buttons dead with no reachable retry — and a quiz lesson has no completion path
 * except passing, so the student was stranded in the course permanently.
 *
 * Releasing unconditionally is safe on success because the parent renders this component only
 * while `!quizResult` (LearnCourseShell.tsx:880), so a successful submit unmounts it and no
 * live button survives on a spent attempt.
 *
 * Exported for test: this component's tests render to static markup, so the lock's behaviour
 * across a resolving-on-failure caller cannot be reached by clicking. The invariant is tested
 * here directly instead of not at all.
 */
export async function runGuardedSubmit(
  locked: boolean,
  setLocked: (v: boolean) => void,
  submit: () => void | Promise<void>,
): Promise<void> {
  if (locked) return;
  setLocked(true);
  try {
    await submit();
  } finally {
    setLocked(false);
  }
}

export function QuizPlayer({ quiz, onSubmit, variant = 'default' }: QuizPlayerProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  // A quiz attempt is DESTRUCTIVE and strictly limited: the schema allows 3, and the API returns
  // 409 once they are gone. There is no learner-visible reset, and a quiz lesson has no
  // completion path except passing — so a student who runs out is locked out of finishing the
  // course permanently. Before this guard, `handleSubmit` called `onSubmit` with nothing to stop
  // a second call, so one impatient double-click on a slow connection spent two of the three.
  const [submitting, setSubmitting] = useState(false);
  const [started, setStarted] = useState(false);
  const enterprise = variant === 'enterprise';

  const answeredCount = Object.keys(answers).length;
  const progressPct = Math.round((answeredCount / quiz.questions.length) * 100);
  const current = quiz.questions[activeIndex];

  function handleSelect(questionId: string, optionIdx: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
  }

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    await runGuardedSubmit(submitting, setSubmitting, () => onSubmit(answers));
  }

  if (!enterprise && !started) {
    const remaining = Math.max(0, quiz.attempts_allowed - (quiz.attempts_used ?? 0));
    return (
      <section className="rounded-xl border border-slate-200 bg-white px-5 py-8 sm:px-8">
        <p className={dash.eyebrow}>Final assessment</p>
        <h2 className={`mt-2 ${dash.h2}`}>{quiz.title}</h2>
        <ul className="mt-4 space-y-1.5 text-sm text-slate-600">
          <li>{quiz.questions.length} questions</li>
          {quiz.time_limit_minutes ? <li>Time limit: {quiz.time_limit_minutes} minutes</li> : null}
          <li>Pass requirement: {quiz.pass_percentage}%</li>
          <li>
            {remaining} attempt{remaining === 1 ? '' : 's'} remaining
          </li>
        </ul>
        <Button type="button" className="mt-6" onClick={() => setStarted(true)} disabled={remaining === 0}>
          Begin assessment
        </Button>
        {remaining === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No attempts remaining for this assessment.</p>
        ) : null}
      </section>
    );
  }

  const allAnswered = answeredCount === quiz.questions.length;

  return (
    <div className="space-y-6">
      {/* Screen-reader-only announcement so Previous/Next/Submit are heard —
          visually nothing changes, the on-screen "Question X of Y" copy
          below already communicates this to sighted users. */}
      <p className="sr-only" role="status" aria-live="polite">
        Question {activeIndex + 1} of {quiz.questions.length}
        {answers[current.id] != null ? ', answered' : ', not yet answered'}
      </p>
      <div className={`${dash.panel} overflow-hidden`}>
        <div className="border-b border-slate-200 bg-gradient-to-r from-[#eef7ff] to-white px-6 py-5">
          <p className={dash.eyebrow}>Knowledge check</p>
          <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">{quiz.title}</h2>
          <p className="mt-2 text-sm text-slate-600">
            Pass mark {quiz.pass_percentage}% · {quiz.attempts_allowed} attempt
            {quiz.attempts_allowed === 1 ? '' : 's'} allowed
          </p>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#2490ed] transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-xs font-medium text-slate-500">
              {answeredCount}/{quiz.questions.length}
            </span>
          </div>
        </div>

        <div className="p-6">
          <p className="mb-2 text-xs font-semibold tracking-wide text-slate-600 uppercase">
            Question {activeIndex + 1} of {quiz.questions.length}
          </p>
          <h3 className="text-lg font-medium text-slate-900">{current.question_text}</h3>

          <div className="mt-6 grid gap-3">
            {current.options.map((opt, idx) => {
              const selected = answers[current.id] === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelect(current.id, idx)}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border px-4 py-4 text-left text-sm transition',
                    selected
                      ? 'border-[#2490ed] bg-[#eef7ff] shadow-sm ring-2 ring-[#2490ed]/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                      selected ? 'border-[#146fc2] bg-[#146fc2] text-white' : 'border-slate-300'
                    )}
                  >
                    {selected ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                  </span>
                  <span className="text-slate-800">{opt.text}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={activeIndex === 0}
              onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
            >
              Previous
            </Button>
            {activeIndex < quiz.questions.length - 1 ? (
              <Button
                type="button"
                onClick={() => setActiveIndex((i) => Math.min(quiz.questions.length - 1, i + 1))}
                disabled={answers[current.id] == null}
              >
                Next question
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} disabled={!allAnswered || submitting}>
                Submit assessment
              </Button>
            )}
          </div>
        </div>
      </div>

      <ol className="flex flex-wrap gap-2">
        {quiz.questions.map((q, i) => (
          <li key={q.id}>
            <button
              type="button"
              onClick={() => setActiveIndex(i)}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-semibold transition',
                i === activeIndex && 'border-[#2490ed] bg-[#eef7ff] text-[#146fc2]',
                i !== activeIndex && answers[q.id] != null && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                i !== activeIndex && answers[q.id] == null && 'border-slate-200 text-slate-500'
              )}
              aria-label={`Question ${i + 1}`}
            >
              {answers[q.id] != null ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function LearnerQuizResult({
  passed,
  scorePercent,
  passPercentage,
  correctCount,
  questionCount,
  attemptsRemaining,
  onContinue,
  onReview,
  saving,
}: {
  passed: boolean;
  scorePercent: number;
  passPercentage: number;
  correctCount?: number | null;
  questionCount?: number | null;
  attemptsRemaining?: number | null;
  onContinue: () => void;
  onReview?: () => void;
  saving?: boolean;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white px-5 py-8 text-center sm:px-8" role="status">
      <p className={dash.eyebrow}>{passed ? 'Assessment complete' : 'Assessment not passed'}</p>
      {correctCount != null && questionCount != null ? (
        <p className="mt-3 text-lg font-semibold tabular-nums text-slate-900">
          {correctCount} / {questionCount} correct
        </p>
      ) : null}
      <p className="mt-2 text-sm text-slate-600">
        Score {scorePercent}% · pass mark {passPercentage}%
        {passed ? ' · Passed' : ''}
      </p>
      {!passed && attemptsRemaining != null ? (
        <p className="mt-2 text-sm text-slate-500">
          {attemptsRemaining > 0
            ? `${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining.`
            : 'No attempts remaining. Review the course material before asking support for help.'}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {passed ? (
          <Button type="button" onClick={onContinue} disabled={saving}>
            {saving ? 'Saving…' : 'Continue'}
          </Button>
        ) : (
          <>
            {onReview ? (
              <Button type="button" variant="outline" onClick={onReview}>
                Review course
              </Button>
            ) : null}
            {attemptsRemaining == null || attemptsRemaining > 0 ? (
              <Button type="button" onClick={onContinue} disabled={saving}>
                Try again
              </Button>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

/** Result panel shown after quiz submission in enterprise mode */
export function EnterpriseQuizResult({
  passed,
  scorePercent,
  passPercentage,
  onContinue,
  loading,
}: {
  passed: boolean;
  scorePercent: number;
  passPercentage: number;
  onContinue?: () => void;
  loading?: boolean;
}) {
  return (
    <div
      className={cn(
        dash.panel,
        'p-8 text-center',
        passed ? 'border-emerald-200' : 'border-amber-200'
      )}
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          'mx-auto flex h-16 w-16 items-center justify-center rounded-2xl',
          passed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
        )}
      >
        {loading ? (
          <Loader2 className="h-8 w-8 animate-spin" />
        ) : passed ? (
          <CheckCircle2 className="h-8 w-8" />
        ) : (
          <Circle className="h-8 w-8" />
        )}
      </div>
      <h3 className="mt-4 text-xl font-semibold text-slate-900">
        {passed ? 'Knowledge check passed' : 'Review required'}
      </h3>
      <p className="mt-2 text-sm text-slate-600">
        Your score: <strong className="text-slate-900">{scorePercent}%</strong> (pass mark{' '}
        {passPercentage}%)
      </p>
      {onContinue ? (
        <Button className="mt-6" onClick={onContinue}>
          {passed ? 'Continue training' : 'Try again'}
        </Button>
      ) : null}
    </div>
  );
}
