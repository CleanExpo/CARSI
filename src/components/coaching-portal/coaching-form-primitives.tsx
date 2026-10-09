'use client';

import type { ReactNode } from 'react';

import { coachingMuted } from '@/components/coaching-portal/coaching-ui';

export const coachingFieldClass =
  'mt-2 w-full rounded-lg border border-white/[0.1] bg-[#060a14]/90 px-3.5 py-2.5 text-sm text-white shadow-inner shadow-black/20 placeholder:text-slate-600 transition-[border-color,box-shadow] focus:border-sky-500/50 focus:outline-none focus:ring-2 focus:ring-sky-500/20 disabled:opacity-55';

export function CoachingFormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent p-5 sm:p-6">
      <h2 className="text-sm font-semibold tracking-tight text-white">{title}</h2>
      <p className={`mt-1.5 ${coachingMuted}`}>{description}</p>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

export function CoachingTextField({
  label,
  value,
  onChange,
  disabled,
  required,
  placeholder,
  type = 'text',
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  type?: 'text' | 'url';
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-400">
        {label}
        {required ? <span className="text-sky-400/90"> *</span> : null}
      </span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={coachingFieldClass}
      />
      {hint ? <p className="mt-1.5 text-[11px] text-slate-500">{hint}</p> : null}
    </label>
  );
}

export function CoachingTextArea({
  label,
  value,
  onChange,
  disabled,
  required,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-400">
        {label}
        {required ? <span className="text-sky-400/90"> *</span> : null}
      </span>
      <textarea
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className={coachingFieldClass}
      />
    </label>
  );
}

export function CoachingSelectField({
  label,
  value,
  onChange,
  disabled,
  required,
  options,
  placeholder = 'Select…',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  required?: boolean;
  options: readonly string[];
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-400">
        {label}
        {required ? <span className="text-sky-400/90"> *</span> : null}
      </span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={coachingFieldClass}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
