'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CCW_COURSE_ZIP_HREF, CCW_COURSE_ZIP_PATH } from '@/lib/ccw/course-zip';
import { ArrowRight, CheckCircle2, Download, Eye, EyeOff, Loader2, Lock } from 'lucide-react';

const SESSION_KEY = 'carsi_ccw_training_unlocked';

export function CcwTrainingClient() {
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && sessionStorage.getItem(SESSION_KEY) === '1') {
        setUnlocked(true);
        setGateOpen(true);
      }
    } catch {
      /* private mode */
    }
  }, []);

  useEffect(() => {
    const section = searchParams.get('section');
    if (section === 'materials' && unlocked) {
      requestAnimationFrame(() => {
        document.getElementById('materials')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [searchParams, unlocked]);

  const onUnlock = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch('/api/ccw-training/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Incorrect password.');
        return;
      }
      try {
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch {
        /* ignore */
      }
      setUnlocked(true);
      setPassword('');
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setPending(false);
    }
  }, [password]);

  return (
    <main className="pb-24 pt-10 md:pt-14">
      <div className="mx-auto max-w-3xl">
        <p className="mb-3 text-center text-[10px] font-semibold tracking-[0.25em] text-white/35 uppercase">
          Instructor-led workshop
        </p>
        <h1 className="text-center text-3xl font-semibold tracking-tight text-white md:text-4xl">
          2-Day Carpet Cleaning Workshop
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed text-white/50">
          The CARSI <span className="text-white/70">CCW</span> programme covers professional carpet
          cleaning methods, chemistry, equipment, and on-the-job practices aligned with industry
          expectations. This page is for enrolled participants to access the workshop resource pack.
        </p>
      </div>

      <div className="mx-auto mt-12 max-w-xl">
        {!unlocked ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 md:p-10">
            {!gateOpen ? (
              <div className="text-center">
                <p className="text-sm text-white/45">
                  Use the password shared with you for this cohort to open the download.
                </p>
                <Button
                  type="button"
                  size="lg"
                  className="mt-8 w-full rounded-xl bg-[#2490ed] text-[15px] font-semibold text-white hover:bg-[#1f82d4] sm:w-auto sm:min-w-[200px]"
                  onClick={() => setGateOpen(true)}
                >
                  Access Course
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Button>
              </div>
            ) : (
              <form onSubmit={onUnlock} className="space-y-5">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[#2490ed]/30 bg-[#2490ed]/10 text-[#7ec5ff]">
                    <Lock className="h-6 w-6" aria-hidden />
                  </div>
                  <p className="text-sm font-medium text-white/85">Enter access password</p>
                  <p className="mt-1 text-xs text-white/40">Case-sensitive.</p>
                </div>
                <div className="relative">
                  <Input
                    id="ccw-training-password"
                    name="password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="off"
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="h-12 border-white/10 bg-black/50 pr-12 text-white placeholder:text-white/25"
                    aria-invalid={error ? true : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-white/75"
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {error ? (
                  <p className="text-center text-sm text-red-400/90" role="alert">
                    {error}
                  </p>
                ) : null}
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-white/45 hover:text-white/75"
                    onClick={() => {
                      setGateOpen(false);
                      setError(null);
                      setPassword('');
                    }}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={pending || !password.trim()}
                    className="rounded-xl bg-[#2490ed] hover:bg-[#1f82d4]"
                  >
                    {pending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying…
                      </>
                    ) : (
                      'Unlock'
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <section
            id="materials"
            className="scroll-mt-28 rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/[0.07] to-white/[0.02] p-8 md:p-10"
          >
            <div className="mb-6 flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-400/90" aria-hidden />
              <div>
                <h2 className="text-lg font-semibold text-white">You&apos;re in</h2>
                <p className="mt-1 text-sm text-white/50">
                  Download the workshop pack. Session only — use the same browser to stay unlocked, or
                  enter the password again later.
                </p>
              </div>
            </div>
            <a
              href={CCW_COURSE_ZIP_HREF}
              download
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-[#2490ed] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#1f82d4] md:inline-flex md:w-auto"
            >
              <Download className="h-5 w-5" aria-hidden />
              Download workshop pack (ZIP)
            </a>
            <p className="mt-4 font-mono text-[11px] text-white/30 break-all">
              {CCW_COURSE_ZIP_PATH.replace(/^\//, '')}
            </p>
          </section>
        )}
      </div>

      <div className="mx-auto mt-16 max-w-2xl border-t border-white/[0.06] pt-10">
        <h3 className="text-sm font-semibold text-white/80">What&apos;s included</h3>
        <ul className="mt-4 space-y-3 text-sm text-white/45">
          <li>Structured two-day curriculum materials and reference content in one archive.</li>
          <li>For participants registered for this CARSI CCW delivery — not a public catalogue course.</li>
        </ul>
      </div>
    </main>
  );
}
