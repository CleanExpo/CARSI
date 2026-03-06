'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface EnrolButtonProps {
  slug: string;
  priceAud?: number;
  isFree?: boolean;
}

export function EnrolButton({ slug, priceAud = 0, isFree = false }: EnrolButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPaid = !isFree && priceAud > 0;
  const label = isPaid ? `Enrol — $${priceAud.toFixed(2)} AUD` : 'Enrol Free';

  async function handleEnrol() {
    setLoading(true);
    setError(null);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
    const userId = typeof window !== 'undefined' ? localStorage.getItem('carsi_user_id') : null;

    if (!userId) {
      setError('Please log in to enrol.');
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
      <Button onClick={handleEnrol} disabled={loading} className="w-full" size="lg">
        {loading ? 'Processing...' : label}
      </Button>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
