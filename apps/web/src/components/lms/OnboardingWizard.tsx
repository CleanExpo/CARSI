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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';

interface OnboardingWizardProps {
  isOpen: boolean;
  onComplete: (pathway: string) => void;
}

interface AnswerCard {
  value: string;
  label: string;
  icon: React.ReactNode;
}

interface WizardStep {
  question: string;
  key: 'industry' | 'role' | 'iicrc_experience' | 'primary_goal';
  answers: AnswerCard[];
}

const STEPS: WizardStep[] = [
  {
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
];

const PATHWAY_LABELS: Record<string, string> = {
  WRT: 'Water Damage Restoration Technician (WRT)',
  ASD: 'Applied Structural Drying (ASD)',
  CRT: 'Commercial Drying Technician (CRT)',
  OCT: 'Odour Control Technician (OCT)',
  CCT: 'Commercial Carpet Technician (CCT)',
  HST: 'Health and Safety Technician (HST)',
};

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
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{
    pathway: string;
    description: string;
    url: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentStep = STEPS[step];
  const totalSteps = STEPS.length;
  const isLastStep = step === totalSteps - 1;

  const handleAnswer = async (value: string) => {
    const newAnswers = { ...answers, [currentStep.key]: value };
    setAnswers(newAnswers);

    if (isLastStep) {
      await submitOnboarding(newAnswers);
    } else {
      setDirection(1);
      setStep((s) => s + 1);
    }
  };

  const submitOnboarding = async (finalAnswers: Record<string, string>) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.post<{
        recommended_pathway: string;
        pathway_description: string;
        suggested_courses_url: string;
      }>('/api/lms/auth/onboarding', finalAnswers);
      setResult({
        pathway: data.recommended_pathway,
        description: data.pathway_description,
        url: data.suggested_courses_url,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    if (result) onComplete(result.pathway);
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
        {/* Step dots */}
        {!result && (
          <div className="mb-8 flex items-center justify-center gap-2">
            {STEPS.map((_, i) => (
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
                {PATHWAY_LABELS[result.pathway] ?? result.pathway}
              </p>
              <p className="mb-8 text-sm leading-relaxed text-white/60">{result.description}</p>
              <Button
                onClick={handleComplete}
                className="w-full gap-2 rounded-sm"
                style={{ background: '#2490ed', color: '#fff' }}
                asChild={false}
              >
                Start Learning
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
              <p className="text-sm text-white/40">Analysing your answers…</p>
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
                }}
                className="rounded-sm"
              >
                Try again
              </Button>
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
              <h2 className="mb-6 text-center text-xl font-semibold text-white">
                {currentStep.question}
              </h2>
              <div className="grid gap-3">
                {currentStep.answers.map((answer) => (
                  <button
                    key={answer.value}
                    onClick={() => handleAnswer(answer.value)}
                    className="flex items-center gap-4 rounded-sm border border-white/[0.06] p-4 text-left transition-all duration-150 hover:border-[#2490ed]/50 hover:bg-white/[0.03]"
                    style={{ background: 'rgba(255,255,255,0.02)' }}
                  >
                    <span style={{ color: '#2490ed' }}>{answer.icon}</span>
                    <span className="text-sm font-medium text-white">{answer.label}</span>
                  </button>
                ))}
              </div>

              {step > 0 && (
                <button
                  onClick={() => {
                    setDirection(-1);
                    setStep((s) => s - 1);
                  }}
                  className="mt-6 w-full text-center text-xs text-white/30 transition-colors hover:text-white/60"
                >
                  ← Back
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
