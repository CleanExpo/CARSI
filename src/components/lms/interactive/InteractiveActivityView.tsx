'use client';

import { useRef, useState } from 'react';

import type {
  DecisionActivity,
  DiagramActivity,
  HazardSpotActivity,
  InteractiveActivity,
  KnowledgeActivity,
  ScenarioActivity,
  SequenceActivity,
} from '@/lib/lms/interactive-experience-types';
import { cn } from '@/lib/utils';

interface ActivityViewProps {
  activity: InteractiveActivity;
  mastered?: boolean;
  onComplete: (earnedXp: number) => void;
}

export function InteractiveActivityView({ activity, mastered, onComplete }: ActivityViewProps) {
  if (mastered) {
    return (
      <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        You have already mastered this activity. Use{' '}
        <strong className="font-semibold">Restart experience</strong> below to run the full practice
        again, or continue to the next activity.
      </p>
    );
  }

  switch (activity.type) {
    case 'scenario':
      return <ScenarioView activity={activity} onComplete={onComplete} />;
    case 'diagram':
      return <DiagramView activity={activity} onComplete={onComplete} />;
    case 'hazard-spot':
      return <HazardSpotView activity={activity} onComplete={onComplete} />;
    case 'decision':
      return <DecisionView activity={activity} onComplete={onComplete} />;
    case 'sequence':
      return <SequenceView activity={activity} onComplete={onComplete} />;
    case 'knowledge':
      return <KnowledgeView activity={activity} onComplete={onComplete} />;
    default:
      return null;
  }
}

function FeedbackPanel({ tone, children }: { tone: 'ok' | 'warn' | 'neutral'; children: string }) {
  return (
    <p
      className={cn(
        'mt-4 rounded-lg border px-4 py-3 text-sm leading-relaxed',
        tone === 'ok' && 'border-emerald-200 bg-emerald-50 text-emerald-950',
        tone === 'warn' && 'border-amber-200 bg-amber-50 text-amber-950',
        tone === 'neutral' && 'border-slate-200 bg-slate-50 text-slate-800'
      )}
    >
      {children}
    </p>
  );
}

function ScenarioView({
  activity,
  onComplete,
}: {
  activity: ScenarioActivity;
  onComplete: (xp: number) => void;
}) {
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const current = activity.steps[step];
  const choice = current.choices.find((c) => c.id === picked);
  const canAdvance = Boolean(choice?.correct);

  const advance = () => {
    if (!canAdvance) return;
    if (step + 1 >= activity.steps.length) {
      onComplete(activity.xp);
    } else {
      setStep(step + 1);
      setPicked(null);
    }
  };

  return (
    <div className="space-y-0">
      <p className="text-sm leading-relaxed text-slate-700">{activity.intro}</p>
      <p className="mt-1 text-xs text-slate-500">
        Step {step + 1} of {activity.steps.length} — choose the safest professional action to
        continue.
      </p>
      <p className="mt-4 text-base font-semibold text-slate-900">{current.prompt}</p>
      <ul className="mt-3 space-y-2" role="listbox" aria-label="Scenario choices">
        {current.choices.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => setPicked(c.id)}
              className={cn(
                'w-full rounded-lg border px-4 py-3 text-left text-sm transition',
                picked === c.id
                  ? c.correct
                    ? 'border-emerald-500 bg-emerald-50 text-slate-900'
                    : 'border-amber-400 bg-amber-50 text-slate-900'
                  : 'border-slate-200 bg-white hover:border-[#2490ed]/40'
              )}
            >
              {c.label}
            </button>
          </li>
        ))}
      </ul>
      {choice ? (
        <>
          <FeedbackPanel tone={choice.correct ? 'ok' : 'warn'}>{choice.feedback}</FeedbackPanel>
          {choice.correct ? (
            <button
              type="button"
              onClick={advance}
              className="mt-4 rounded-lg bg-[#146fc2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#125da3]"
            >
              {step + 1 >= activity.steps.length ? 'Complete scenario' : 'Next step'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setPicked(null)}
              className="mt-4 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Try another option
            </button>
          )}
        </>
      ) : null}
    </div>
  );
}

function DiagramView({
  activity,
  onComplete,
}: {
  activity: DiagramActivity;
  onComplete: (xp: number) => void;
}) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [finished, setFinished] = useState(false);
  const detailRef = useRef<HTMLUListElement>(null);
  const required = activity.hotspots.length;
  const revealedCount = revealed.size;

  const reveal = (id: string) => {
    if (finished) return;
    setRevealed((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev).add(id);
      queueMicrotask(() =>
        detailRef.current?.lastElementChild?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        })
      );
      return next;
    });
  };

  const finish = () => {
    if (revealedCount < required || finished) return;
    setFinished(true);
    onComplete(activity.xp);
  };

  return (
    <div>
      <p className="mb-3 text-sm text-slate-600">
        Explore each numbered marker on the hazard map ({revealedCount} of {required} opened).
      </p>
      <div className="relative w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element -- course SVG diagram asset */}
        <img src={activity.imageSrc} alt={activity.imageAlt} className="block h-auto w-full" />
        {activity.hotspots.map((h) => (
          <button
            key={h.id}
            type="button"
            aria-expanded={revealed.has(h.id)}
            aria-label={`${h.markerNumber ? `Marker ${h.markerNumber}: ` : ''}${h.label}`}
            onClick={() => reveal(h.id)}
            className={cn(
              'absolute flex items-center justify-center rounded-md border-2 text-xs font-bold transition focus-visible:ring-2 focus-visible:ring-[#146fc2] focus-visible:ring-offset-2',
              revealed.has(h.id)
                ? 'border-emerald-600 bg-emerald-500/25 text-emerald-950'
                : 'border-[#146fc2] bg-[#146fc2]/20 text-[#0d4d8c] hover:bg-[#146fc2]/30'
            )}
            style={{
              left: `${h.x}%`,
              top: `${h.y}%`,
              width: `${h.w}%`,
              height: `${h.h}%`,
              minHeight: '2.25rem',
            }}
          >
            {h.markerNumber ?? ''}
          </button>
        ))}
      </div>
      <ul ref={detailRef} className="mt-4 space-y-2">
        {activity.hotspots.map((h) =>
          revealed.has(h.id) ? (
            <li
              key={h.id}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
            >
              {h.markerNumber ? (
                <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#146fc2] text-xs font-bold text-white">
                  {h.markerNumber}
                </span>
              ) : null}
              <span className="font-semibold text-slate-900">{h.label}:</span> {h.detail}
            </li>
          ) : null
        )}
      </ul>
      <button
        type="button"
        disabled={revealedCount < required || finished}
        onClick={finish}
        className="mt-4 rounded-lg bg-[#146fc2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#125da3] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {finished ? 'Diagram complete' : 'Continue'}
      </button>
    </div>
  );
}

function HazardSpotView({
  activity,
  onComplete,
}: {
  activity: HazardSpotActivity;
  onComplete: (xp: number) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const toggle = (id: string) => {
    if (submitted) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const correctSet = new Set(activity.correctIds);
  const success =
    submitted &&
    selected.size === correctSet.size &&
    [...correctSet].every((id) => selected.has(id));

  const submit = () => {
    setSubmitted(true);
    setAttempts((a) => a + 1);
    if (selected.size === correctSet.size && [...correctSet].every((id) => selected.has(id))) {
      onComplete(activity.xp);
    }
  };

  const retry = () => {
    setSubmitted(false);
    setSelected(new Set());
  };

  return (
    <div>
      <p className="text-sm font-medium text-slate-900">{activity.prompt}</p>
      <ul className="mt-3 space-y-2">
        {activity.options.map((o) => (
          <li key={o.id}>
            <button
              type="button"
              onClick={() => toggle(o.id)}
              disabled={submitted && success}
              className={cn(
                'flex w-full items-start gap-2 rounded-lg border px-4 py-3 text-left text-sm',
                selected.has(o.id) ? 'border-[#146fc2] bg-[#146fc2]/5' : 'border-slate-200 bg-white'
              )}
            >
              <span
                className={cn(
                  'mt-0.5 inline-flex h-4 w-4 shrink-0 rounded border',
                  selected.has(o.id) ? 'border-[#146fc2] bg-[#146fc2]' : 'border-slate-300'
                )}
                aria-hidden
              />
              {o.label}
            </button>
          </li>
        ))}
      </ul>
      {!submitted ? (
        <button
          type="button"
          onClick={submit}
          disabled={selected.size === 0}
          className="mt-4 rounded-lg bg-[#146fc2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#125da3] disabled:opacity-40"
        >
          Check hazards
        </button>
      ) : success ? (
        <FeedbackPanel tone="ok">{activity.successFeedback}</FeedbackPanel>
      ) : (
        <>
          <FeedbackPanel tone="warn">
            Not quite — electrical, biological, slip, structural and on-site chemical hazards are
            all in play on this job. Noise from traffic is not the focus inside the flooded room.
          </FeedbackPanel>
          {attempts < 4 ? (
            <button
              type="button"
              onClick={retry}
              className="mt-3 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Try again
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}

function DecisionView({
  activity,
  onComplete,
}: {
  activity: DecisionActivity;
  onComplete: (xp: number) => void;
}) {
  const [choiceId, setChoiceId] = useState<string | null>(null);
  const [passed, setPassed] = useState(false);
  const choice = activity.choices.find((c) => c.id === choiceId);

  const pick = (id: string, correct?: boolean) => {
    setChoiceId(id);
    if (correct && !passed) {
      setPassed(true);
      onComplete(activity.xp);
    }
  };

  return (
    <div>
      <p className="text-sm text-slate-700">{activity.scene}</p>
      <p className="mt-3 font-semibold text-slate-900">{activity.prompt}</p>
      <ul className="mt-3 space-y-2">
        {activity.choices.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              disabled={passed && c.id !== choiceId}
              onClick={() => pick(c.id, c.correct)}
              className={cn(
                'w-full rounded-lg border px-4 py-3 text-left text-sm',
                choiceId === c.id ? 'border-[#146fc2] bg-[#146fc2]/5' : 'border-slate-200 bg-white'
              )}
            >
              {c.label}
            </button>
          </li>
        ))}
      </ul>
      {choice ? (
        <>
          <FeedbackPanel tone={choice.correct ? 'ok' : 'warn'}>{choice.feedback}</FeedbackPanel>
          {choice.followUp ? <FeedbackPanel tone="neutral">{choice.followUp}</FeedbackPanel> : null}
          {!choice.correct && !passed ? (
            <button
              type="button"
              onClick={() => setChoiceId(null)}
              className="mt-3 text-sm font-semibold text-[#146fc2] hover:underline"
            >
              Choose a different response
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function SequenceView({
  activity,
  onComplete,
}: {
  activity: SequenceActivity;
  onComplete: (xp: number) => void;
}) {
  const [order, setOrder] = useState<number[]>([]);
  const [done, setDone] = useState(false);

  const pick = (index: number) => {
    if (done || order.includes(index)) return;
    const next = [...order, index];
    setOrder(next);
    if (next.length === activity.items.length) {
      const ok = next.every((v, i) => v === activity.correctOrder[i]);
      setDone(true);
      if (ok) onComplete(activity.xp);
    }
  };

  const reset = () => {
    setOrder([]);
    setDone(false);
  };

  const ok = done && order.every((v, i) => v === activity.correctOrder[i]);

  return (
    <div>
      <p className="text-sm text-slate-800">{activity.prompt}</p>
      {order.length > 0 ? (
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-900">
          {order.map((idx, pos) => (
            <li key={`${idx}-pos-${pos}`}>{activity.items[idx]}</li>
          ))}
        </ol>
      ) : (
        <p className="mt-2 text-xs text-slate-500">
          Tap each step in the order you would take on site.
        </p>
      )}
      <ul className="mt-4 flex flex-wrap gap-2">
        {activity.items.map((item, index) => (
          <li key={item}>
            <button
              type="button"
              disabled={order.includes(index) || (done && ok)}
              onClick={() => pick(index)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:border-[#2490ed]/50 disabled:opacity-40"
            >
              {item}
            </button>
          </li>
        ))}
      </ul>
      {done ? (
        <>
          <FeedbackPanel tone={ok ? 'ok' : 'warn'}>
            {ok
              ? activity.successFeedback
              : 'That order does not match the restoration arc. Safety and hazard control come first.'}
          </FeedbackPanel>
          {!ok ? (
            <button
              type="button"
              onClick={reset}
              className="mt-3 text-sm font-semibold text-[#146fc2] hover:underline"
            >
              Reset sequence
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function KnowledgeView({
  activity,
  onComplete,
}: {
  activity: KnowledgeActivity;
  onComplete: (xp: number) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [passed, setPassed] = useState(false);
  const correct = picked === activity.correctId;

  const choose = (id: string) => {
    setPicked(id);
    if (id === activity.correctId && !passed) {
      setPassed(true);
      onComplete(activity.xp);
    }
  };

  return (
    <div>
      <p className="font-medium text-slate-900">{activity.prompt}</p>
      <ul className="mt-3 space-y-2">
        {activity.options.map((o) => (
          <li key={o.id}>
            <button
              type="button"
              disabled={passed && o.id !== activity.correctId}
              onClick={() => choose(o.id)}
              className={cn(
                'w-full rounded-lg border px-4 py-3 text-left text-sm',
                picked === o.id ? 'border-[#146fc2] bg-[#146fc2]/5' : 'border-slate-200 bg-white'
              )}
            >
              {o.label}
            </button>
          </li>
        ))}
      </ul>
      {picked ? (
        <>
          <FeedbackPanel tone={correct ? 'ok' : 'warn'}>
            {correct ? activity.successFeedback : activity.incorrectFeedback}
          </FeedbackPanel>
          {!correct && !passed ? (
            <button
              type="button"
              onClick={() => setPicked(null)}
              className="mt-3 text-sm font-semibold text-[#146fc2] hover:underline"
            >
              Try again
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
