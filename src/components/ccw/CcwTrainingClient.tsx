'use client';

import { HomeFaqSection } from '@/components/landing/HomeFaqSection';
import { HomeFinalCtaSection } from '@/components/landing/HomeFinalCtaSection';
import { HomeTrustStrip } from '@/components/landing/HomeTrustStrip';
import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { MarketingGrowthLinks } from '@/components/marketing/MarketingGrowthLinks';
import { PlatformNav } from '@/components/marketing/PlatformNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CCW_COURSE_ZIP_HREF, CCW_COURSE_ZIP_PATH } from '@/lib/ccw/course-zip';
import { ccwWorkshopPath } from '@/lib/marketing/marketing-growth-links';
import { marketingInput } from '@/lib/marketing/marketing-ui';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  Lock,
  ShieldCheck,
  Target,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

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
    text: "ANSI/IICRC S100 · S300 · S220 · S500 · S520 (Phill's Drive library)",
  },
  {
    term: 'CARSI',
    text: 'IICRC CEC Accredited courses across 7 disciplines',
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
    <li className="border-b border-slate-200/80 py-3 text-sm leading-relaxed text-slate-600 last:border-0">
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
        // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing RA-4192 rule promotion; behaviour-preserving suppression, real fix tracked separately
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
        document
          .getElementById('materials')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [searchParams, unlocked]);

  const onUnlock = useCallback(
    async (e: React.FormEvent) => {
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
    },
    [password]
  );

  const faqs = faq.map((item) => ({ question: item.q, answer: item.a }));

  return (
    <>
      <section className="relative overflow-hidden border-b border-slate-200/70 bg-white">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_80%_0%,rgba(36,144,237,0.11),transparent_58%)]"
          aria-hidden
        />
        <div className={`relative ${PUBLIC_SHELL_INNER_CLASS} py-16 text-center md:py-24`}>
          <p className={LANDING_EYEBROW_CLASS}>CARSI · 2 days · Hands-on</p>
          <h1 className="mx-auto mt-3 max-w-3xl font-[family-name:var(--font-display)] text-[2.15rem] leading-[1.1] font-semibold tracking-[-0.02em] text-slate-950 md:text-[3.1rem] md:leading-[1.06]">
            The Carpet Cleaning Workshop
          </h1>
          <p className={`mx-auto mt-5 max-w-2xl ${LANDING_LEAD_CLASS}`}>{PILLAR_LINE}</p>
          <p className="mx-auto mt-3 text-sm font-medium text-[#146fc2]">{ANCHORED_HERO}</p>
          <p className={`mx-auto mt-6 max-w-xl ${LANDING_LEAD_CLASS}`}>
            This page is for enrolled participants to access the workshop resource pack after your
            session.
          </p>
          <div className="flex justify-center">
            <PlatformNav current="/ccw-training" />
          </div>
        </div>
      </section>

      <HomeTrustStrip
        stats={[
          { value: '2 days', label: 'Workshop' },
          { value: '5', label: 'Deliverables' },
          { value: '3 tiers', label: 'Newby · Intermediate · Pro' },
          { value: 'ZIP', label: 'Take-home pack' },
        ]}
      />

      {/* Your trainer */}
      <section
        className="border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24"
        aria-labelledby="ccw-trainer-heading"
      >
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <p className={LANDING_EYEBROW_CLASS}>Your trainer</p>
          <h2 id="ccw-trainer-heading" className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
            Phill McGurk — CARSI
          </h2>
          <p className={`mt-4 max-w-2xl ${LANDING_LEAD_CLASS}`}>
            The two days you are about to do are built from a library of real IICRC standards and
            distilled into a CARSI original curriculum you can take home.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {trainerMeta.map(({ term, text }) => (
              <div
                key={term}
                className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm md:p-6"
              >
                <p className="text-[10px] font-semibold tracking-[0.18em] text-[#146fc2] uppercase">
                  {term}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agenda */}
      <section
        className="border-t border-slate-200/70 bg-white py-16 md:py-24"
        aria-labelledby="ccw-agenda-heading"
      >
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <p className={LANDING_EYEBROW_CLASS}>Agenda</p>
          <h2 id="ccw-agenda-heading" className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
            Two days — five deliverables
          </h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-2 lg:gap-8">
            <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-[#fafbfc] p-6 md:p-8">
              <div className="mb-4 flex items-center gap-2 border-b border-slate-200/80 pb-4">
                <GraduationCap className="h-5 w-5 text-[#146fc2]" aria-hidden />
                <span className="text-sm font-semibold text-slate-950">Day 1</span>
              </div>
              <p className="mb-4 text-xs font-medium tracking-wide text-slate-600 uppercase dark:text-white/55">
                Carpet &amp; Stain Fundamentals
              </p>
              <ul className="list-none space-y-0">
                {agendaDay1.map((line) => (
                  <AgendaLine key={line} text={line} />
                ))}
              </ul>
            </div>
            <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-[#fafbfc] p-6 md:p-8">
              <div className="mb-4 flex items-center gap-2 border-b border-slate-200/80 pb-4">
                <GraduationCap className="h-5 w-5 text-[#146fc2]" aria-hidden />
                <span className="text-sm font-semibold text-slate-950">Day 2</span>
              </div>
              <p className="mb-4 text-xs font-medium tracking-wide text-slate-600 uppercase dark:text-white/55">
                Upholstery · Hard Floors · Business · Maintenance
              </p>
              <ul className="list-none space-y-0">
                {agendaDay2.map((line) => (
                  <AgendaLine key={line} text={line} />
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* What's included */}
      <section
        className="border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24"
        aria-labelledby="ccw-included-heading"
      >
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <p className={LANDING_EYEBROW_CLASS}>Deliverables</p>
          <h2 id="ccw-included-heading" className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
            What&apos;s included
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {included.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-[#fafbfc]">
                  <Icon className="h-5 w-5 text-[#146fc2]" aria-hidden />
                </div>
                <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Materials gate */}
      <section
        className="border-t border-slate-200/70 bg-white py-16 md:py-24"
        aria-labelledby="ccw-access-heading"
      >
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <div className="mb-8 text-center md:mb-10">
            <p className={LANDING_EYEBROW_CLASS}>Participants</p>
            <h2 id="ccw-access-heading" className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>
              Workshop materials
            </h2>
            <p className={`mx-auto mt-3 max-w-md ${LANDING_LEAD_CLASS}`}>
              Unlock below to download the take-home pack for your cohort.
            </p>
          </div>

          <div className="mx-auto w-full max-w-xl">
            {!unlocked ? (
              <div className="rounded-2xl border border-slate-200/80 bg-[#fafbfc] p-8 shadow-sm md:p-10">
                {!gateOpen ? (
                  <div className="text-center">
                    <p className="text-sm leading-relaxed text-slate-600">
                      Use the password shared with you for this cohort to open the download.
                    </p>
                    <Button
                      type="button"
                      size="lg"
                      className="mt-8 w-full rounded-xl bg-[#146fc2] text-[15px] font-semibold text-white shadow-lg shadow-[#2490ed]/20 hover:bg-[#1769b8] sm:w-auto sm:min-w-[220px]"
                      onClick={() => setGateOpen(true)}
                    >
                      Access Course
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={onUnlock} className="space-y-6">
                    <div className="text-center">
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#146fc2]">
                        <Lock className="h-6 w-6" aria-hidden />
                      </div>
                      <p className="text-sm font-medium text-slate-950">Enter access password</p>
                      <p className="mt-1 text-xs text-slate-500">Case-sensitive.</p>
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
                        className={`h-12 pr-12 ${marketingInput}`}
                        aria-invalid={error ? true : undefined}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(!showPw)}
                        className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-700 dark:text-white/55 dark:hover:bg-white/5 dark:hover:text-white/75"
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
                        className="text-slate-600 hover:text-slate-800 dark:text-white/55 dark:hover:text-white/75"
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
                        className="rounded-xl bg-[#146fc2] hover:bg-[#1769b8]"
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
                className="scroll-mt-28 rounded-2xl border border-emerald-500/25 bg-emerald-50 p-8 shadow-sm md:p-10 dark:bg-linear-to-b dark:from-emerald-500/8 dark:to-white/2 dark:shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
              >
                <div className="mb-6 flex items-start gap-3">
                  <CheckCircle2
                    className="mt-0.5 h-6 w-6 shrink-0 text-emerald-400/90"
                    aria-hidden
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      You&apos;re in
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-white/50">
                      Download the workshop pack. This session remembers unlock in your browser; use
                      the password again if you return in a new session.
                    </p>
                  </div>
                </div>
                <a
                  href={CCW_COURSE_ZIP_HREF}
                  download
                  className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-[#146fc2] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#1769b8] sm:w-auto"
                >
                  <Download className="h-5 w-5 shrink-0" aria-hidden />
                  Download workshop pack (ZIP)
                </a>
                <p className="mt-4 font-mono text-[11px] break-all text-slate-600 dark:text-white/55">
                  {CCW_COURSE_ZIP_PATH.replace(/^\//, '')}
                </p>
              </section>
            )}
          </div>
        </div>
      </section>

      <HomeFaqSection faqs={faqs} />
      <div className={`${PUBLIC_SHELL_INNER_CLASS} py-12`}>
        <MarketingGrowthLinks currentHref={ccwWorkshopPath} />
      </div>
      <HomeFinalCtaSection />
    </>
  );
}
