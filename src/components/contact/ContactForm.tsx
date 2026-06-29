'use client';

import { useState } from 'react';

import { TurnstileWidget } from '@/components/security/TurnstileWidget';

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
}

export interface ContactLeadContext {
  source?: string;
  topic?: string;
  pathway?: string;
  intent?: string;
  pageUrl?: string;
  initialMessage?: string;
}

type Status = 'idle' | 'sending' | 'success' | 'error';

const INITIAL: FormState = { firstName: '', lastName: '', email: '', message: '' };

function formatContextLabel(value?: string) {
  return value
    ?.replaceAll('-', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

export function ContactForm({ leadContext }: { leadContext?: ContactLeadContext }) {
  const initialForm = {
    ...INITIAL,
    message: leadContext?.initialMessage ?? '',
  };
  const [form, setForm] = useState<FormState>(initialForm);
  const [status, setStatus] = useState<Status>('idle');
  const [reference, setReference] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState('');
  const hasLeadContext = Boolean(
    leadContext?.source || leadContext?.topic || leadContext?.pathway || leadContext?.intent,
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, leadContext, turnstileToken }),
      });
      const data = (await res.json().catch(() => ({}))) as { reference?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setReference(data.reference ?? null);
      setStatus('success');
      setForm(initialForm);
    } catch {
      setStatus('error');
    }
  }

  const fieldClass =
    'w-full rounded-lg px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#2490ed]/60 focus:ring-2 focus:ring-[#2490ed]/15';
  const fieldStyle = {
    background: '#ffffff',
    border: '1px solid rgba(15,23,42,0.14)',
    color: '#0f172a',
  };
  const labelStyle = { color: '#334155' };

  if (status === 'success') {
    return (
      <div
        className="flex min-h-[320px] flex-col items-center justify-center rounded-lg bg-white p-10 text-center shadow-sm"
        style={{
          border: '1px solid rgba(36,144,237,0.2)',
        }}
      >
        <p className="mb-2 text-2xl font-bold text-slate-950">
          Message sent
        </p>
        <p className="text-sm text-slate-600">
          {reference
            ? `Reference ${reference}. We reply within one business day.`
            : 'Thanks for reaching out. We reply within one business day.'}
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus('idle');
            setReference(null);
            setForm(initialForm);
          }}
          className="mt-6 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    /* WebMCP annotations expose this form to in-browser AI agents per the
       GEO standard (Pi-CEO skills/geo-optimization/SKILL.md §5). */
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
      // @ts-expect-error WebMCP attributes are W3C-draft and not yet in React's type defs
      toolname="submit_contact_enquiry"
      tooldescription="Submit a contact enquiry to CARSI (Australia's leading IICRC continuing-education platform). Routes to support@carsi.com.au for human follow-up. Use for course questions, membership enquiries, certification queries, or general support."
    >
      {hasLeadContext ? (
        <div
          className="rounded-lg p-4"
          style={{
            background: '#eef7ff',
            border: '1px solid rgba(36,144,237,0.22)',
          }}
        >
          <p className="text-xs font-semibold tracking-wide text-[#146fc2] uppercase">
            Lead context attached
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {[
              ['Source', formatContextLabel(leadContext?.source)],
              ['Topic', leadContext?.topic],
              ['Pathway', formatContextLabel(leadContext?.pathway)],
              ['Intent', formatContextLabel(leadContext?.intent)],
            ]
              .filter(([, value]) => Boolean(value))
              .map(([label, value]) => (
                <div key={label} className="rounded-lg bg-white px-3 py-2">
                  <p className="text-[10px] font-semibold tracking-wide text-slate-700 uppercase">
                    {label}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-700">
                    {value}
                  </p>
                </div>
              ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="firstName" className="block text-xs font-medium" style={labelStyle}>
            First Name
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            value={form.firstName}
            onChange={handleChange}
            placeholder="Jane"
            className={fieldClass}
            style={fieldStyle}
            // @ts-expect-error WebMCP attribute — W3C draft, not yet in React types
            toolparamdescription="Enquirer's first name"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="lastName" className="block text-xs font-medium" style={labelStyle}>
            Last Name
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            required
            value={form.lastName}
            onChange={handleChange}
            placeholder="Smith"
            className={fieldClass}
            style={fieldStyle}
            // @ts-expect-error WebMCP attribute — W3C draft, not yet in React types
            toolparamdescription="Enquirer's last name (family name)"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-xs font-medium" style={labelStyle}>
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={form.email}
          onChange={handleChange}
          placeholder="jane@example.com.au"
          className={fieldClass}
          style={fieldStyle}
          // @ts-expect-error WebMCP attribute — W3C draft, not yet in React types
          toolparamdescription="Valid email address where the CARSI team should reply"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="message" className="block text-xs font-medium" style={labelStyle}>
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          maxLength={3000}
          value={form.message}
          onChange={handleChange}
          placeholder="Tell us how we can help — course questions, membership enquiries, or anything else..."
          className={fieldClass}
          style={{ ...fieldStyle, resize: 'vertical' }}
          // @ts-expect-error WebMCP attribute — W3C draft, not yet in React types
          toolparamdescription="Free-text enquiry (max 3000 chars). Mention which IICRC discipline (WRT, CRT, ASD, AMRT, FSRT, OCT, CCT) if applicable, and whether the enquiry is for individual or group/corporate enrolment."
        />
      </div>

      {status === 'error' && (
        <p className="text-xs text-red-700">
          Something went wrong. Please try again or email support@carsi.com.au
        </p>
      )}

      <TurnstileWidget onVerify={setTurnstileToken} />

      <button
        type="submit"
        disabled={status === 'sending'}
        className="min-h-12 rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
        style={{ background: '#146fc2' }}
      >
        {status === 'sending' ? 'Sending…' : 'Send Message'}
      </button>
    </form>
  );
}
