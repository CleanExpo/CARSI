'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export function CcwGate() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <input
        id="ccw-password"
        name="password"
        type="password"
        autoComplete="off"
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-md px-3 py-2 text-sm outline-none"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.9)',
        }}
        aria-describedby={error ? 'ccw-password-error' : undefined}
      />
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
