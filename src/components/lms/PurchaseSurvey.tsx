'use client';

import { useState } from 'react';

import {
  FOUND_VIA_OPTIONS,
  INDUSTRY_OPTIONS,
  OTHER_TEXT_MAX_LENGTH,
  SURVEY_PURPOSE_NOTICE,
  type SurveyOption,
} from '@/lib/marketing/purchase-survey';

type Status = 'open' | 'sending' | 'saved' | 'failed' | 'skipped';

function ChoiceGroup({
  legend,
  options,
  selected,
  onSelect,
  otherId,
  otherValue,
  onOtherChange,
  disabled,
}: {
  legend: string;
  options: readonly SurveyOption[];
  selected: string | null;
  onSelect: (value: string) => void;
  otherId: string;
  otherValue: string;
  onOtherChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-white/85">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const pressed = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={pressed}
              disabled={disabled}
              onClick={() => onSelect(option.value)}
              className={`min-h-[44px] rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                pressed
                  ? 'border-[#2490ed] bg-[#146fc2]/30 text-white'
                  : 'border-white/15 bg-white/5 text-white/75 hover:border-white/30'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {selected === 'other' ? (
        <div className="space-y-1">
          <label htmlFor={otherId} className="sr-only">
            {`${legend} (other)`}
          </label>
          <input
            id={otherId}
            type="text"
            maxLength={OTHER_TEXT_MAX_LENGTH}
            value={otherValue}
            disabled={disabled}
            onChange={(e) => onOtherChange(e.target.value)}
            placeholder="A few words (no contact details)"
            className="w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white"
          />
        </div>
      ) : null}
    </fieldset>
  );
}

/**
 * Optional two-question survey on the guest payment-success screen (Authority Machine slice 1b).
 * It is never a gate: skipping, sending or a failed save all leave the page fully usable, and it
 * renders no form element so it cannot submit the password form around it.
 */
export function PurchaseSurvey({ sessionId }: { sessionId: string | null }) {
  const [industry, setIndustry] = useState<string | null>(null);
  const [industryOther, setIndustryOther] = useState('');
  const [foundVia, setFoundVia] = useState<string | null>(null);
  const [foundViaOther, setFoundViaOther] = useState('');
  const [status, setStatus] = useState<Status>('open');

  if (!sessionId || status === 'skipped') return null;

  if (status === 'saved') {
    return (
      <p role="status" className="text-sm text-white/70">
        Thank you. Your answers help us decide which courses to build next.
      </p>
    );
  }

  async function send() {
    if (!industry && !foundVia) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/lms/checkout/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          ...(industry ? { industry } : {}),
          ...(industry === 'other' && industryOther.trim() ? { industry_other: industryOther.trim() } : {}),
          ...(foundVia ? { found_via: foundVia } : {}),
          ...(foundVia === 'other' && foundViaOther.trim() ? { found_via_other: foundViaOther.trim() } : {}),
        }),
      });
      setStatus(res.ok ? 'saved' : 'failed');
    } catch {
      setStatus('failed');
    }
  }

  const sending = status === 'sending';

  return (
    <section aria-labelledby="purchase-survey-heading" className="space-y-3 rounded-md border border-white/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <h2 id="purchase-survey-heading" className="text-base font-semibold text-white">
          Two quick questions
        </h2>
        <button
          type="button"
          onClick={() => setStatus('skipped')}
          className="text-sm text-white/60 underline underline-offset-2"
        >
          Skip
        </button>
      </div>
      <p className="text-xs text-white/55">{SURVEY_PURPOSE_NOTICE}</p>
      <ChoiceGroup
        legend="What work do you do?"
        options={INDUSTRY_OPTIONS}
        selected={industry}
        onSelect={setIndustry}
        otherId="svy-industry-other"
        otherValue={industryOther}
        onOtherChange={setIndustryOther}
        disabled={sending}
      />
      <ChoiceGroup
        legend="How did you find us?"
        options={FOUND_VIA_OPTIONS}
        selected={foundVia}
        onSelect={setFoundVia}
        otherId="svy-found-via-other"
        otherValue={foundViaOther}
        onOtherChange={setFoundViaOther}
        disabled={sending}
      />
      {status === 'failed' ? (
        <p role="status" className="text-sm text-amber-200/90">
          We could not save your answers. That is fine: your course is ready below.
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => void send()}
        disabled={sending || (!industry && !foundVia)}
        className="min-h-[44px] rounded-md border border-white/20 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {sending ? 'Sending…' : 'Send answers'}
      </button>
    </section>
  );
}
