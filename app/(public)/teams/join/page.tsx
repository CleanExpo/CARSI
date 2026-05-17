'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { useAuth } from '@/components/auth/auth-provider';
import { apiClient, ApiClientError } from '@/lib/api/client';

function JoinTeamInner() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState<'idle' | 'working' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !token) return;
    setStatus('working');
    apiClient
      .post<{ team_slug: string }>('/api/lms/teams/invite/accept', { token })
      .then((data) => {
        setStatus('ok');
        router.replace(`/dashboard/team`);
        void data;
      })
      .catch((e) => {
        setStatus('error');
        setMessage(e instanceof ApiClientError ? e.message : 'Could not accept invite');
      });
  }, [user, token, router]);

  if (!token) {
    return (
      <p className="text-white/60">
        Missing invite token. Ask your team owner to send a new link.
      </p>
    );
  }

  if (!user) {
    return (
      <p className="text-white/70">
        <Link href={`/login?next=/teams/join?token=${encodeURIComponent(token)}`} className="text-[#7ec5ff] hover:underline">
          Sign in
        </Link>{' '}
        to accept your team invite.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-md text-center">
      {status === 'working' || status === 'idle' ? (
        <p className="text-white/60">Accepting invite…</p>
      ) : null}
      {status === 'error' ? (
        <>
          <p className="text-red-300">{message}</p>
          <Link href="/dashboard/team" className="mt-4 inline-block text-[#7ec5ff] hover:underline">
            Go to team dashboard
          </Link>
        </>
      ) : null}
    </div>
  );
}

export default function JoinTeamPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4" style={{ background: '#060a14' }}>
      <Suspense fallback={<p className="text-white/50">Loading…</p>}>
        <JoinTeamInner />
      </Suspense>
    </main>
  );
}
