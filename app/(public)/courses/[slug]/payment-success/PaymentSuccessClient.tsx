'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api/client';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

function isSafeInternalPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('://');
}

type Phase = 'confirming' | 'guest_setup' | 'done' | 'error';

export function PaymentSuccessClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : '';

  const [phase, setPhase] = useState<Phase>('confirming');
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [learnUrl, setLearnUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isTeamPurchase = searchParams.get('purchase') === 'team';
  const teamSeatsParam = searchParams.get('seats');
  const teamCourseParam = searchParams.get('course') ?? slug;
  const sessionId = searchParams.get('session_id');

  const teamNextPath =
    sessionId && teamSeatsParam
      ? `/dashboard/team?session_id=${encodeURIComponent(sessionId)}&from_purchase=1&course=${encodeURIComponent(teamCourseParam)}&seats=${encodeURIComponent(teamSeatsParam)}`
      : null;

  const nextRaw = searchParams.get('next') ?? teamNextPath ?? '/dashboard/student';
  const nextPath = isSafeInternalPath(nextRaw) ? nextRaw : '/dashboard/student';

  useEffect(() => {
    if (isTeamPurchase && teamNextPath) {
      router.replace(teamNextPath);
    }
  }, [isTeamPurchase, teamNextPath, router]);

  useEffect(() => {
    if (isTeamPurchase) return;

    let cancelled = false;

    (async () => {
      if (!sessionId && !slug) {
        setPhase('error');
        setConfirmError('Missing payment session.');
        return;
      }

      try {
        const data = await apiClient.post<{ learn_url?: string }>('/api/lms/enrollments/confirm', {
          ...(sessionId ? { session_id: sessionId } : { slug }),
        });
        if (!cancelled) {
          const dest = data.learn_url ?? nextPath;
          setLearnUrl(dest);
          setPhase('done');
          router.push(dest);
        }
        return;
      } catch {
        // Not logged in — guest checkout completion
      }

      if (!sessionId) {
        if (!cancelled) {
          setPhase('error');
          setConfirmError('Sign in or complete account setup below.');
        }
        return;
      }

      try {
        const info = await fetch(
          `/api/lms/checkout/session?session_id=${encodeURIComponent(sessionId)}`,
        ).then(
          (r) =>
            r.json() as Promise<{
              email?: string;
              guest_checkout?: boolean;
            }>,
        );
        if (!cancelled && info.email) {
          setSessionEmail(info.email);
          const stored = sessionStorage.getItem('carsi_guest_checkout');
          if (stored) {
            try {
              const parsed = JSON.parse(stored) as { fullName?: string };
              if (parsed.fullName) setFullName(parsed.fullName);
            } catch {
              /* ignore */
            }
          }
          setPhase('guest_setup');
          return;
        }
      } catch {
        /* fall through */
      }

      if (!cancelled) {
        setPhase('error');
        setConfirmError('We could not verify enrolment. Contact support@carsi.com.au');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, nextPath, sessionId, slug, isTeamPurchase]);

  async function handleGuestComplete(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionId) return;
    setSubmitting(true);
    setConfirmError(null);
    try {
      const res = await fetch('/api/lms/enrollments/guest-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          password,
          full_name: fullName,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        learn_url?: string;
        detail?: string;
      };
      if (!res.ok) {
        setConfirmError(data.detail ?? 'Could not finish setup');
        return;
      }
      sessionStorage.removeItem('carsi_guest_checkout');
      window.location.href = data.learn_url ?? nextPath;
    } catch {
      setConfirmError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (isTeamPurchase) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <Card className="w-full max-w-md border-[0.5px] border-white/6 bg-[#050505]">
          <CardContent className="p-8 text-center">
            <p className="text-white/60">Taking you to your team dashboard…</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (phase === 'guest_setup') {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <Card className="w-full max-w-md border-[0.5px] border-white/6 bg-[#050505]">
          <CardContent className="space-y-4 p-8">
            <h1 className="text-2xl font-bold text-white">Payment successful</h1>
            <p className="text-sm text-white/60">
              Create your password for{' '}
              <strong className="text-white/80">{sessionEmail}</strong> to access your course.
            </p>
            <form onSubmit={handleGuestComplete} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="ps-full-name">Full name</Label>
                <Input
                  id="ps-full-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="border-white/15 bg-white/5 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ps-password">Password</Label>
                <Input
                  id="ps-password"
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-white/15 bg-white/5 text-white"
                />
              </div>
              {confirmError ? <p className="text-sm text-amber-200/90">{confirmError}</p> : null}
              <Button type="submit" disabled={submitting} className="w-full bg-[#2490ed]">
                {submitting ? 'Setting up…' : 'Start lesson 1'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-md border-[0.5px] border-white/6 bg-[#050505]">
        <CardContent className="p-8 text-center">
          <div className="mb-4 text-4xl">&#10003;</div>
          <h1 className="mb-2 text-2xl font-bold text-white">
            {phase === 'confirming' ? 'Confirming enrolment…' : 'Payment successful'}
          </h1>
          <p className="mb-2 text-white/60">
            {phase === 'done' && learnUrl
              ? 'Taking you to your first lesson…'
              : phase === 'confirming'
                ? 'Please wait a moment.'
                : confirmError ?? 'Redirecting…'}
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
