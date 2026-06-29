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
  questions: QuizQuestion[];
}

interface QuizPlayerProps {
  quiz: Quiz;
  onSubmit: (answers: Record<string, number>) => void;
  variant?: 'default' | 'enterprise';
}

export function QuizPlayer({ quiz, onSubmit, variant = 'default' }: QuizPlayerProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const enterprise = variant === 'enterprise';

  const answeredCount = Object.keys(answers).length;
  const progressPct = Math.round((answeredCount / quiz.questions.length) * 100);
  const current = quiz.questions[activeIndex];

  function handleSelect(questionId: string, optionIdx: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
  }

  function handleSubmit() {
    onSubmit(answers);
  }

  if (!enterprise) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold">{quiz.title}</h2>
          <p className="text-muted-foreground text-sm">
            Passing score: {quiz.pass_percentage}% &nbsp;|&nbsp; Attempts allowed:{' '}
            {quiz.attempts_allowed}
          </p>
        </div>
        {quiz.questions.map((q, qIdx) => (
          <fieldset key={q.id} className="space-y-3">
            <legend className="text-base font-medium">
              <span className="text-muted-foreground mr-1">{qIdx + 1}.</span> {q.question_text}
            </legend>
            {q.options.map((opt, idx) => (
              <label
                key={idx}
                className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-lg border p-3"
              >
                <input
                  type="radio"
                  name={q.id}
                  value={idx}
                  checked={answers[q.id] === idx}
                  onChange={() => handleSelect(q.id, idx)}
                />
                {opt.text}
              </label>
            ))}
          </fieldset>
        ))}
        <Button onClick={handleSubmit}>Submit Quiz</Button>
      </div>
    );
  }

  const allAnswered = answeredCount === quiz.questions.length;

  return (
    <div className="space-y-6">
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
              <Button type="button" onClick={handleSubmit} disabled={!allAnswered}>
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
