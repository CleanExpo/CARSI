'use client';

import { useState } from 'react';

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
}

type Status = 'idle' | 'sending' | 'success' | 'error';

const INITIAL: FormState = { firstName: '', lastName: '', email: '', message: '' };

export function ContactForm() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [status, setStatus] = useState<Status>('idle');
  const [reference, setReference] = useState<string | null>(null);

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
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => ({}))) as { reference?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setReference(data.reference ?? null);
      setStatus('success');
      setForm(INITIAL);
    } catch {
      setStatus('error');
    }
  }

  const fieldClass =
    'w-full rounded-sm px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-white/20 focus:border-[#2490ed]/60';
  const fieldStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.85)',
  };
  const labelStyle = { color: 'rgba(255,255,255,0.5)' };

  if (status === 'success') {
    return (
      <div
        className="flex min-h-[320px] flex-col items-center justify-center rounded-lg p-10 text-center"
        style={{
          background: 'rgba(36,144,237,0.05)',
          border: '1px solid rgba(36,144,237,0.2)',
        }}
      >
        <p className="mb-2 text-2xl font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>
          Message sent ✓
        </p>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {reference
            ? `Reference ${reference}. We reply within one business day.`
            : 'Thanks for reaching out. We reply within one business day.'}
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus('idle');
            setReference(null);
          }}
          className="mt-6 rounded-sm px-4 py-2 text-xs font-medium transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}
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
        <p className="text-xs" style={{ color: '#ff6b6b' }}>
          Something went wrong. Please try again or email support@carsi.com.au
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="rounded-sm px-6 py-3 text-sm font-semibold transition-opacity disabled:opacity-60"
        style={{ background: '#2490ed', color: '#fff' }}
      >
        {status === 'sending' ? 'Sending…' : 'Send Message'}
      </button>
    </form>
  );
}
