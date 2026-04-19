'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CCW_COURSE_ZIP_HREF, CCW_COURSE_ZIP_PATH } from '@/lib/ccw/course-zip';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Download,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  Lock,
  ShieldCheck,
  Target,
} from 'lucide-react';

const SESSION_KEY = 'carsi_ccw_training_unlocked';

/** Pillar topics — hero. */
const PILLAR_LINE =
  'Fibre · Chemistry · Methods · Upholstery · Hard Floors · Business · Maintenance';

/** Standards line — hero (primary anchor). */
const ANCHORED_HERO = 'Anchored in ANSI/IICRC S100 · S300 · S220';

const agendaDay1 = [
  'Welcome · Safety · Tier Self-Assessment',
  'Fibre Science — live burn tests',
  'Chemistry — pH, surfactants, CHAT',
  '5 Principles — 4-station hands-on',
  'Machinery — preventive maintenance',
  'Spot & Stain — decision tree',
  'Close · networking',
] as const;

const agendaDay2 = [
  'Upholstery fibres & 4-test pre-inspection',
  'Upholstery — 6 methods hands-on',
  'Hard Floors — inspection basics',
  'Business — costing, pricing, contracts',
  'Boardroom synthesis · take-home pack',
] as const;

const included = [
  {
    icon: BookOpen,
    title: 'CARSI original curriculum',
    body: 'Built from a library of real IICRC standards and distilled into a take-home programme you can use on the job.',
  },
  {
    icon: Target,
    title: 'Two days — five deliverables',
    body: 'Hands-on modules across carpet, stain removal, upholstery, hard floors, business, and maintenance.',
  },
  {
    icon: ShieldCheck,
    title: 'Cohort resource pack',
    body: 'Participants unlock the workshop pack below with the password provided for your delivery.',
  },
] as const;

const trainerMeta = [
  {
    term: 'Anchored',
    text: 'ANSI/IICRC S100 · S300 · S220 · S500 · S520 (Phill\'s Drive library)',
  },
  {
    term: 'CARSI',
    text: 'IICRC-approved CEC provider, 90+ courses across 7 disciplines',
  },
  {
    term: 'Focus',
    text: 'Carpet · Stain Removal · Upholstery · Hard Floors · Business · Machinery',
  },
  {
    term: 'Method',
    text: 'Three tiers — Newby, Intermediate, Pro — layered into every module',
  },
] as const;

const faq = [
  {
    q: 'Who can use this page?',
    a: 'Enrolled participants in the current CARSI Carpet Cleaning Workshop cohort. Use the password provided for your group.',
  },
  {
    q: 'What will I download?',
    a: 'A single ZIP file containing the workshop resource pack, including materials referenced in the boardroom synthesis and take-home segment.',
  },
  {
    q: 'Why do I need a password?',
    a: 'The pack is for registered participants only. The password keeps distribution aligned with each delivery.',
  },
  {
    q: 'Will my access persist?',
    a: 'After a successful unlock, this browser session remembers access until you close the tab or clear site data. You can unlock again anytime with the password.',
  },
] as const;

function AgendaLine({ text }: { text: string }) {
  return (
    <li className="border-b border-white/6 py-3 text-sm leading-relaxed text-white/55 last:border-0">
      {text}
    </li>
  );
}

export function CcwTrainingClient() {
  const searchParams = useSearchParams();
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
    <main className="relative pb-28 pt-12 md:pt-16">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(420px,55vh)] bg-[radial-gradient(ellipse_70%_60%_at_50%_-10%,rgba(36,144,237,0.14),transparent_65%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        {/* Hero */}
        <header className="text-center">
          <p className="mb-4 text-[10px] font-semibold tracking-[0.22em] text-white/40 uppercase">
            CARSI · 2 DAYS · HANDS-ON
          </p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-white md:text-5xl">
            The Carpet Cleaning Workshop
          </h1>
          <div
            className="mx-auto mt-6 h-px w-16 bg-linear-to-r from-transparent via-[#2490ed]/80 to-transparent"
            aria-hidden
          />
          <p className="mx-auto mt-6 max-w-3xl text-sm leading-relaxed tracking-wide text-white/45 md:text-[15px]">
            {PILLAR_LINE}
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-xs font-medium text-[#7ec5ff]/90 md:text-sm">
            {ANCHORED_HERO}
          </p>
          <p className="mx-auto mt-8 max-w-2xl text-pretty text-base leading-relaxed text-white/50 md:text-lg">
            This page is for enrolled participants to access the workshop resource pack after your session.
          </p>
        </header>

        {/* Your trainer */}
        <section className="mt-20 md:mt-24" aria-labelledby="ccw-trainer-heading">
          <div className="mb-8 border-b border-white/8 pb-6">
            <p className="text-[10px] font-semibold tracking-[0.22em] text-white/35 uppercase">
              Your trainer
            </p>
            <h2 id="ccw-trainer-heading" className="mt-1 text-xl font-semibold tracking-tight text-white md:text-2xl">
              Phill McGurk — CARSI
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-pretty text-sm leading-relaxed text-white/50 md:text-base">
              The two days you are about to do are built from a library of real IICRC standards and distilled
              into a CARSI original curriculum you can take home.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {trainerMeta.map(({ term, text }) => (
              <div key={term} className="glass-sm rounded-2xl p-5 md:p-6">
                <p className="text-[10px] font-semibold tracking-[0.18em] text-[#7ec5ff]/80 uppercase">
                  {term}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Agenda */}
        <section className="mt-20 md:mt-24" aria-labelledby="ccw-agenda-heading">
          <div className="mb-8 flex flex-col gap-2 border-b border-white/8 pb-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.22em] text-white/35 uppercase">Agenda</p>
              <h2 id="ccw-agenda-heading" className="mt-1 text-xl font-semibold tracking-tight text-white md:text-2xl">
                Two Days — Five Deliverables
              </h2>
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
            <div className="glass-sm flex flex-col rounded-2xl p-6 md:p-8">
              <div className="mb-4 flex items-center gap-2 border-b border-white/8 pb-4">
                <GraduationCap className="h-5 w-5 text-[#7ec5ff]" aria-hidden />
                <span className="text-sm font-semibold text-white/90">Day 1</span>
              </div>
              <p className="mb-4 text-xs font-medium tracking-wide text-white/45 uppercase">
                Carpet &amp; Stain Fundamentals
              </p>
              <ul className="list-none space-y-0">
                {agendaDay1.map((line) => (
                  <AgendaLine key={line} text={line} />
                ))}
              </ul>
            </div>
            <div className="glass-sm flex flex-col rounded-2xl p-6 md:p-8">
              <div className="mb-4 flex items-center gap-2 border-b border-white/8 pb-4">
                <GraduationCap className="h-5 w-5 text-[#7ec5ff]" aria-hidden />
                <span className="text-sm font-semibold text-white/90">Day 2</span>
              </div>
              <p className="mb-4 text-xs font-medium tracking-wide text-white/45 uppercase">
                Upholstery · Hard Floors · Business · Maintenance
              </p>
              <ul className="list-none space-y-0">
                {agendaDay2.map((line) => (
                  <AgendaLine key={line} text={line} />
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* What's included */}
        <section className="mt-20 md:mt-24" aria-labelledby="ccw-included-heading">
          <div className="mb-8">
            <p className="text-[10px] font-semibold tracking-[0.22em] text-white/35 uppercase">
              Deliverables
            </p>
            <h2 id="ccw-included-heading" className="mt-1 text-xl font-semibold tracking-tight text-white md:text-2xl">
              What&apos;s included
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {included.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="glass-card rounded-2xl p-6 transition-none hover:translate-y-0"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/4">
                  <Icon className="h-5 w-5 text-[#7ec5ff]" aria-hidden />
                </div>
                <h3 className="text-sm font-semibold text-white/95">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/45">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Materials gate */}
        <section className="mt-20 md:mt-28" aria-labelledby="ccw-access-heading">
          <div className="mb-8 text-center md:mb-10">
            <p className="text-[10px] font-semibold tracking-[0.22em] text-white/35 uppercase">
              Participants
            </p>
            <h2 id="ccw-access-heading" className="mt-1 text-xl font-semibold tracking-tight text-white md:text-2xl">
              Workshop materials
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/40">
              Unlock below to download the take-home pack for your cohort.
            </p>
          </div>

          <div className="mx-auto w-full max-w-xl">
            {!unlocked ? (
              <div className="glass-strong rounded-2xl p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)] md:p-10">
                {!gateOpen ? (
                  <div className="text-center">
                    <p className="text-sm leading-relaxed text-white/50">
                      Use the password shared with you for this cohort to open the download.
                    </p>
                    <Button
                      type="button"
                      size="lg"
                      className="mt-8 w-full rounded-xl bg-[#2490ed] text-[15px] font-semibold text-white shadow-lg shadow-[#2490ed]/20 hover:bg-[#1f82d4] sm:w-auto sm:min-w-[220px]"
                      onClick={() => setGateOpen(true)}
                    >
                      Access Course
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={onUnlock} className="space-y-6">
                    <div className="text-center">
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[#2490ed]/30 bg-[#2490ed]/10 text-[#7ec5ff]">
                        <Lock className="h-6 w-6" aria-hidden />
                      </div>
                      <p className="text-sm font-medium text-white/90">Enter access password</p>
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
                className="scroll-mt-28 rounded-2xl border border-emerald-500/25 bg-linear-to-b from-emerald-500/8 to-white/2 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-10"
              >
                <div className="mb-6 flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-400/90" aria-hidden />
                  <div>
                    <h3 className="text-lg font-semibold text-white">You&apos;re in</h3>
                    <p className="mt-1 text-sm leading-relaxed text-white/50">
                      Download the workshop pack. This session remembers unlock in your browser; use the
                      password again if you return in a new session.
                    </p>
                  </div>
                </div>
                <a
                  href={CCW_COURSE_ZIP_HREF}
                  download
                  className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-[#2490ed] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#1f82d4] sm:w-auto"
                >
                  <Download className="h-5 w-5 shrink-0" aria-hidden />
                  Download workshop pack (ZIP)
                </a>
                <p className="mt-4 font-mono text-[11px] text-white/30 break-all">
                  {CCW_COURSE_ZIP_PATH.replace(/^\//, '')}
                </p>
              </section>
            )}
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto mt-20 max-w-3xl md:mt-24" aria-labelledby="ccw-faq-heading">
          <div className="mb-8 text-center">
            <p className="text-[10px] font-semibold tracking-[0.22em] text-white/35 uppercase">
              Help
            </p>
            <h2 id="ccw-faq-heading" className="mt-1 text-xl font-semibold tracking-tight text-white md:text-2xl">
              Frequently asked questions
            </h2>
          </div>
          <div className="space-y-2">
            {faq.map((item) => (
              <details
                key={item.q}
                className="group glass-sm rounded-xl px-5 py-1 transition-colors open:bg-white/3"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-sm font-medium text-white/85 [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <ChevronDown className="h-4 w-4 shrink-0 text-white/35 transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <p className="border-t border-white/6 pb-4 pt-0 text-sm leading-relaxed text-white/45">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
