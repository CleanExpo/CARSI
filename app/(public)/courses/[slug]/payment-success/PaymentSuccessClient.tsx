'use client';

import { Card, CardContent } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

function isSafeInternalPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('://');
}

export function PaymentSuccessClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const [countdown, setCountdown] = useState(3);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const nextRaw = searchParams.get('next') ?? '/dashboard/student';
  const nextPath = isSafeInternalPath(nextRaw) ? nextRaw : '/dashboard/student';
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    (async () => {
      if (sessionId) {
        try {
          await apiClient.post('/api/lms/enrollments/confirm', { session_id: sessionId });
        } catch {
          if (!cancelled) {
            setConfirmError('We could not verify enrolment automatically. Check My Learning or contact support.');
          }
        }
      } else if (slug) {
        try {
          await apiClient.post('/api/lms/enrollments/confirm', { slug });
        } catch {
          if (!cancelled) {
            setConfirmError('We could not verify enrolment automatically. Check My Learning or contact support.');
          }
        }
      }

      if (cancelled) return;

      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timer) clearInterval(timer);
            router.push(nextPath);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    })();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [router, nextPath, sessionId, slug]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-md border-[0.5px] border-white/6 bg-[#050505]">
        <CardContent className="p-8 text-center">
          <div className="mb-4 text-4xl">&#10003;</div>
          <h1 className="mb-2 text-2xl font-bold text-white">Payment Successful</h1>
          <p className="mb-2 text-white/60">
            You are now enrolled. Redirecting in {countdown}…
          </p>
          {confirmError ? (
            <p className="text-sm text-amber-200/90">{confirmError}</p>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
