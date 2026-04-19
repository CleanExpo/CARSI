'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  HardHat,
  HeartPulse,
  LandPlot,
  Wrench,
  Users,
  Briefcase,
  Sprout,
  GraduationCap,
  RefreshCw,
  TrendingUp,
  ArrowRight,
  Calendar,
  Bell,
  BellOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';

interface OnboardingWizardProps {
  isOpen: boolean;
  onComplete: (destination: string) => void;
}

const POST_ONBOARDING_PATH = '/dashboard/student';

interface AnswerCard {
  value: string;
  label: string;
  icon: React.ReactNode;
}

type FlowItem =
  | {
      kind: 'single';
      question: string;
      key: 'industry' | 'role' | 'iicrc_experience' | 'primary_goal';
      answers: AnswerCard[];
    }
  | {
      kind: 'multi';
      question: string;
      key: 'disciplines_held';
      options: { value: string; label: string }[];
    }
  | { kind: 'renewal'; question: string };

const FLOW: FlowItem[] = [
  {
    kind: 'single',
    question: "What's your industry?",
    key: 'industry',
    answers: [
      {
        value: 'restoration',
        label: 'Restoration & Remediation',
        icon: <Building2 className="h-6 w-6" />,
      },
      {
        value: 'construction',
        label: 'Construction & Trades',
        icon: <HardHat className="h-6 w-6" />,
      },
      { value: 'healthcare', label: 'Healthcare', icon: <HeartPulse className="h-6 w-6" /> },
      {
        value: 'government',
        label: 'Government & Defence',
        icon: <LandPlot className="h-6 w-6" />,
      },
    ],
  },
  {
    kind: 'single',
    question: "What's your role?",
    key: 'role',
    answers: [
      { value: 'technician', label: 'Field Technician', icon: <Wrench className="h-6 w-6" /> },
      {
        value: 'supervisor',
        label: 'Supervisor / Team Leader',
        icon: <Users className="h-6 w-6" />,
      },
      { value: 'owner', label: 'Business Owner', icon: <Briefcase className="h-6 w-6" /> },
      {
        value: 'new_to_industry',
        label: 'New to the Industry',
        icon: <Sprout className="h-6 w-6" />,
      },
    ],
  },
  {
    kind: 'single',
    question: 'IICRC experience?',
    key: 'iicrc_experience',
    answers: [
      {
        value: 'none',
        label: 'No certifications yet',
        icon: <GraduationCap className="h-6 w-6" />,
      },
      { value: 'some', label: 'Some training / exposure', icon: <RefreshCw className="h-6 w-6" /> },
      {
        value: 'certified',
        label: 'Already IICRC certified',
        icon: <TrendingUp className="h-6 w-6" />,
      },
    ],
  },
  {
    kind: 'multi',
    question: 'Which IICRC disciplines do you hold or plan to work in? Select all that apply.',
    key: 'disciplines_held',
    options: [
      { value: 'WRT', label: 'WRT — Water' },
      { value: 'CRT', label: 'CRT — Carpet' },
      { value: 'ASD', label: 'ASD — Structural drying' },
      { value: 'AMRT', label: 'AMRT — Microbial' },
      { value: 'FSRT', label: 'FSRT — Fire & smoke' },
      { value: 'OCT', label: 'OCT — Odour' },
      { value: 'CCT', label: 'CCT — Carpet cleaning' },
    ],
  },
  {
    kind: 'single',
    question: "What's your main goal?",
    key: 'primary_goal',
    answers: [
      {
        value: 'new_cert',
        label: 'Earn a new IICRC certification',
        icon: <GraduationCap className="h-6 w-6" />,
      },
      { value: 'cec_renewal', label: 'Renew CECs', icon: <RefreshCw className="h-6 w-6" /> },
      {
        value: 'career_change',
        label: 'Career change into the industry',
        icon: <TrendingUp className="h-6 w-6" />,
      },
    ],
  },
  {
    kind: 'renewal',
    question: 'Renewal & reminders (optional)',
  },
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
  }),
  centre: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -60 : 60,
    opacity: 0,
  }),
};

export function OnboardingWizard({ isOpen, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [disciplines, setDisciplines] = useState<Set<string>>(new Set());
  const [renewalDate, setRenewalDate] = useState('');
  const [resumeReminder, setResumeReminder] = useState<'none' | 'email' | 'sms'>('none');
  const [result, setResult] = useState<{
    pathway: string;
    pathwayLabel: string;
    description: string;
    suggestedUrl: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const current = FLOW[step];
  const totalSteps = FLOW.length;
  const isLastStep = step === totalSteps - 1;

  function goNext() {
    setDirection(1);
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  }

  function goBack() {
    setDirection(-1);
    setStep((s) => Math.max(0, s - 1));
  }

  const handleSingleAnswer = (value: string) => {
    const meta = FLOW[step];
    if (meta.kind !== 'single') return;
    const newAnswers = { ...answers, [meta.key]: value };
    setAnswers(newAnswers);
    if (!isLastStep) {
      goNext();
    }
  };

  function toggleDiscipline(value: string) {
    setDisciplines((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function continueFromDisciplines() {
    const codes = [...disciplines];
    setAnswers((a) => ({ ...a, disciplines_held: codes }));
    goNext();
  }

  const submitOnboarding = async () => {
    setLoading(true);
    setError(null);
    const held =
      Array.isArray(answers.disciplines_held) && answers.disciplines_held.length > 0
        ? (answers.disciplines_held as string[])
        : [...disciplines];

    const payload: Record<string, unknown> = {
      industry: answers.industry,
      role: answers.role,
      iicrc_experience: answers.iicrc_experience,
      disciplines_held: held,
      primary_goal: String(answers.primary_goal ?? ''),
      renewal_date: renewalDate.trim() || null,
      resume_reminder_opt_in: resumeReminder,
    };

    try {
      const data = await apiClient.post<{
        recommended_pathway: string;
        pathway_label?: string;
        pathway_description: string;
        suggested_courses_url: string;
      }>('/api/lms/auth/onboarding', payload);
      setResult({
        pathway: data.recommended_pathway,
        pathwayLabel: data.pathway_label ?? data.recommended_pathway,
        description: data.pathway_description,
        suggestedUrl: data.suggested_courses_url,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    onComplete(result?.suggestedUrl ?? POST_ONBOARDING_PATH);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(5, 5, 5, 0.85)', backdropFilter: 'blur(12px)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Onboarding wizard"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className="relative w-full max-w-lg rounded-sm border border-white/[0.06] p-8"
        style={{ background: '#060a14' }}
      >
        {!result && (
          <div className="mb-8 flex items-center justify-center gap-2">
            {FLOW.map((_, i) => (
              <div
                key={i}
                className="h-2 rounded-sm transition-all duration-300"
                style={{
                  width: i === step ? '24px' : '8px',
                  background: i <= step ? '#2490ed' : 'rgba(255,255,255,0.1)',
                }}
              />
            ))}
          </div>
        )}

        <AnimatePresence custom={direction} mode="wait">
          {result ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="text-center"
            >
              <div
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-sm"
                style={{
                  background: 'rgba(36,144,237,0.12)',
                  border: '1px solid rgba(36,144,237,0.3)',
                }}
              >
                <GraduationCap className="h-8 w-8" style={{ color: '#2490ed' }} />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-white">We recommend starting with</h2>
              <p className="mb-3 text-lg font-bold" style={{ color: '#2490ed' }}>
                {result.pathwayLabel}
              </p>
              <p className="mb-8 text-sm leading-relaxed text-white/60">{result.description}</p>
              <Button
                onClick={handleComplete}
                className="w-full gap-2 rounded-sm"
                style={{ background: '#2490ed', color: '#fff' }}
                asChild={false}
              >
                Go to your dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          ) : loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12"
            >
              <div
                className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-transparent"
                style={{ borderTopColor: '#2490ed' }}
              />
              <p className="text-sm text-white/40">Saving your preferences…</p>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-8 text-center"
            >
              <p className="mb-4 text-sm text-red-400">{error}</p>
              <Button
                variant="outline"
                onClick={() => {
                  setError(null);
                  setStep(0);
                  setAnswers({});
                  setDisciplines(new Set());
                }}
                className="rounded-sm"
              >
                Try again
              </Button>
            </motion.div>
          ) : current.kind === 'renewal' ? (
            <motion.div
              key="renewal"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="centre"
              exit="exit"
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
              <h2 className="mb-2 text-center text-xl font-semibold text-white">{current.question}</h2>
              <p className="mb-6 text-center text-xs text-white/40">
                Used for your renewal cockpit. You can change this anytime in profile.
              </p>
              <label className="block text-xs font-medium text-white/50" htmlFor="renewal_date">
                Certification / renewal date (optional)
              </label>
              <div className="mt-2 flex items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0 text-white/30" aria-hidden />
                <input
                  id="renewal_date"
                  type="date"
                  value={renewalDate}
                  onChange={(e) => setRenewalDate(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#0a0f1a] px-3 py-2.5 text-sm text-white"
                />
              </div>
              <p className="mt-6 text-xs font-medium text-white/50">Resume reminders (optional)</p>
              <p className="mt-1 text-[11px] text-white/35">
                We can nudge you about unfinished lessons. SMS may be enabled later — email is available
                now where configured.
              </p>
              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  onClick={() => setResumeReminder('none')}
                  className={`flex items-center gap-3 rounded-sm border p-3 text-left text-sm transition ${
                    resumeReminder === 'none'
                      ? 'border-[#2490ed]/50 bg-[#2490ed]/10'
                      : 'border-white/[0.06] bg-white/[0.02]'
                  }`}
                >
                  <BellOff className="h-5 w-5 shrink-0 text-white/40" />
                  <span className="text-white/85">No reminders</span>
                </button>
                <button
                  type="button"
                  onClick={() => setResumeReminder('email')}
                  className={`flex items-center gap-3 rounded-sm border p-3 text-left text-sm transition ${
                    resumeReminder === 'email'
                      ? 'border-[#2490ed]/50 bg-[#2490ed]/10'
                      : 'border-white/[0.06] bg-white/[0.02]'
                  }`}
                >
                  <Bell className="h-5 w-5 shrink-0 text-[#2490ed]" />
                  <span className="text-white/85">Email me about unfinished lessons (opt-in)</span>
                </button>
                <button
                  type="button"
                  disabled
                  className="flex cursor-not-allowed items-center gap-3 rounded-sm border border-white/[0.04] p-3 text-left text-sm opacity-40"
                >
                  <Bell className="h-5 w-5 shrink-0" />
                  <span className="text-white/50">SMS reminders — coming soon</span>
                </button>
              </div>
              <Button
                type="button"
                onClick={() => void submitOnboarding()}
                className="mt-8 w-full rounded-sm"
                style={{ background: '#2490ed', color: '#fff' }}
              >
                Finish
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <button
                type="button"
                onClick={goBack}
                className="mt-4 w-full text-center text-xs text-white/30 transition-colors hover:text-white/60"
              >
                ← Back
              </button>
            </motion.div>
          ) : current.kind === 'multi' ? (
            <motion.div
              key="multi"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="centre"
              exit="exit"
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
              <h2 className="mb-6 text-center text-xl font-semibold text-white">{current.question}</h2>
              <div className="grid gap-2">
                {current.options.map((opt) => {
                  const on = disciplines.has(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleDiscipline(opt.value)}
                      className={`rounded-sm border px-4 py-3 text-left text-sm transition ${
                        on
                          ? 'border-[#2490ed]/50 bg-[#2490ed]/10 text-white'
                          : 'border-white/[0.06] bg-white/[0.02] text-white/80'
                      }`}
                    >
                      <span className="font-mono text-xs font-bold text-[#2490ed]">{opt.value}</span>
                      <span className="ml-2">{opt.label.replace(/^[A-Z]{2,5}\s—\s/, '')}</span>
                    </button>
                  );
                })}
              </div>
              <Button
                type="button"
                onClick={continueFromDisciplines}
                className="mt-8 w-full rounded-sm"
                style={{ background: '#2490ed', color: '#fff' }}
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              {step > 0 ? (
                <button
                  type="button"
                  onClick={goBack}
                  className="mt-4 w-full text-center text-xs text-white/30 transition-colors hover:text-white/60"
                >
                  ← Back
                </button>
              ) : null}
            </motion.div>
          ) : (
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="centre"
              exit="exit"
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
              <h2 className="mb-6 text-center text-xl font-semibold text-white">{current.question}</h2>
              <div className="grid gap-3">
                {current.answers.map((answer) => (
                  <button
                    key={answer.value}
                    type="button"
                    onClick={() => handleSingleAnswer(answer.value)}
                    className="flex items-center gap-4 rounded-sm border border-white/[0.06] p-4 text-left transition-all duration-150 hover:border-[#2490ed]/50 hover:bg-white/[0.03]"
                    style={{ background: 'rgba(255,255,255,0.02)' }}
                  >
                    <span style={{ color: '#2490ed' }}>{answer.icon}</span>
                    <span className="text-sm font-medium text-white">{answer.label}</span>
                  </button>
                ))}
              </div>

              {step > 0 ? (
                <button
                  type="button"
                  onClick={goBack}
                  className="mt-6 w-full text-center text-xs text-white/30 transition-colors hover:text-white/60"
                >
                  ← Back
                </button>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
