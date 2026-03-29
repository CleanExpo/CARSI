'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';

function isSafeInternalPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('://');
}

export function PaymentSuccessClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(3);

  const nextRaw = searchParams.get('next') ?? '/student';
  const nextPath = isSafeInternalPath(nextRaw) ? nextRaw : '/student';

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push(nextPath);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router, nextPath]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-md border-[0.5px] border-white/6 bg-[#050505]">
        <CardContent className="p-8 text-center">
          <div className="mb-4 text-4xl">&#10003;</div>
          <h1 className="mb-2 text-2xl font-bold text-white">Payment Successful</h1>
          <p className="mb-6 text-white/60">
            You are now enrolled. Redirecting in {countdown}...
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
