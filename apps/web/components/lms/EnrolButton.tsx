'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface EnrolButtonProps {
  slug: string;
  priceAud?: number;
  isFree?: boolean;
}

type SubState = 'checking' | 'subscribed' | 'none';

export function EnrolButton({ slug, priceAud = 0, isFree = false }: EnrolButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subState, setSubState] = useState<SubState>('checking');

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

  useEffect(() => {
    const userId = typeof window !== 'undefined' ? localStorage.getItem('carsi_user_id') : null;
    if (!userId) {
      setSubState('none');
      return;
    }
    fetch(`${backendUrl}/api/lms/subscription/status`, {
      headers: { 'X-User-Id': userId },
    })
      .then((r) => r.json())
      .then((data) => {
        const active = data.has_subscription && ['active', 'trialling'].includes(data.status ?? '');
        setSubState(active ? 'subscribed' : 'none');
      })
      .catch(() => setSubState('none'));
  }, [backendUrl]);

  const isPaid = !isFree && priceAud > 0;

  function getLabel() {
    if (loading) return 'Processing…';
    if (subState === 'checking') return '…';
    if (subState === 'subscribed') return 'Access Course — Included in Pro';
    return isPaid ? `Enrol — $${priceAud.toFixed(0)} AUD` : 'Enrol Free';
  }

  async function handleEnrol() {
    setLoading(true);
    setError(null);

    const userId = typeof window !== 'undefined' ? localStorage.getItem('carsi_user_id') : null;

    if (!userId) {
      setError('Please log in to access this course.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${backendUrl}/api/lms/courses/${slug}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
      });

      if (res.status === 409) {
        setError('You are already enrolled in this course.');
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.detail ?? 'Something went wrong. Please try again.');
        setLoading(false);
        return;
      }

      const data = await res.json();

      if (data.enrolled) {
        window.location.href = '/student';
        return;
      }

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button
        onClick={handleEnrol}
        disabled={loading || subState === 'checking'}
        className="w-full"
        size="lg"
      >
        {getLabel()}
      </Button>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
