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
      if (!res.ok) throw new Error('Failed');
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
          Thanks for reaching out. We&apos;ll be in touch within 1–2 business days.
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="mt-6 rounded-sm px-4 py-2 text-xs font-medium transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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
          value={form.message}
          onChange={handleChange}
          placeholder="Tell us how we can help — course questions, membership enquiries, or anything else..."
          className={fieldClass}
          style={{ ...fieldStyle, resize: 'vertical' }}
        />
      </div>

      {status === 'error' && (
        <p className="text-xs" style={{ color: '#ff6b6b' }}>
          Something went wrong. Please try again or email us directly at support@carsi.com.au
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
