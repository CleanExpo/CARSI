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
    'w-full rounded-sm border border-input bg-secondary px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-primary/60 focus:ring-1 focus:ring-primary/30';

  if (status === 'success') {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-sm border border-primary/20 bg-primary/5 p-10 text-center">
        <p className="mb-2 text-2xl font-bold text-foreground">Message sent ✓</p>
        <p className="text-sm text-muted-foreground">
          Thanks for reaching out. We&apos;ll be in touch within 1–2 business days.
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="mt-6 rounded-sm bg-secondary px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/80"
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
          <label htmlFor="firstName" className="block text-xs font-medium text-muted-foreground">
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
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="lastName" className="block text-xs font-medium text-muted-foreground">
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
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-xs font-medium text-muted-foreground">
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
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="message" className="block text-xs font-medium text-muted-foreground">
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
          style={{ resize: 'vertical' }}
        />
      </div>

      {status === 'error' && (
        <p className="text-xs text-destructive">
          Something went wrong. Please try again or email us directly at support@carsi.com.au
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="rounded-sm bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {status === 'sending' ? 'Sending…' : 'Send Message'}
      </button>
    </form>
  );
}
