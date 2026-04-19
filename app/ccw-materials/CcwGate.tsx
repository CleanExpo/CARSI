'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export function CcwGate() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!password.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/ccw-materials/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || 'Incorrect password');
        setBusy(false);
        return;
      }
      // Cookie is set by the server; refresh the page so the server component
      // re-renders with the authenticated panel.
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg p-6"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <label
        htmlFor="ccw-password"
        className="block text-xs font-semibold tracking-wide uppercase"
        style={{ color: 'rgba(255,255,255,0.55)' }}
      >
        Workshop Password
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id="ccw-password"
          name="password"
          type={visible ? 'text' : 'password'}
          autoComplete="off"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md px-3 py-2 text-sm outline-none"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.9)',
            paddingRight: '40px',
          }}
          aria-describedby={error ? 'ccw-password-error' : undefined}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          title={visible ? 'Hide password' : 'Show password'}
          style={{
            position: 'absolute',
            top: '50%',
            right: '8px',
            transform: 'translateY(-50%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            padding: 0,
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
          }}
        >
          {visible ? (
            // Eye-off (password visible — click to hide)
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            // Eye (password hidden — click to reveal)
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      {error ? (
        <p
          id="ccw-password-error"
          className="text-xs"
          style={{ color: '#f87171' }}
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy || !password.trim()}
        className="w-full rounded-md px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-50"
        style={{ background: '#2C5F2D', color: '#ffffff' }}
      >
        {busy ? 'Verifying…' : 'Unlock Materials'}
      </button>
      <p className="pt-2 text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
        Don&apos;t have the password? The access code is shared in person at the start of the
        2-Day Carpet Cleaning Workshop. Contact your instructor if you&apos;ve misplaced it.
      </p>
    </form>
  );
}
