'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ClipboardList, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuizPlayer } from '@/components/lms/QuizPlayer';
import { QuizResult } from '@/components/lms/QuizResult';
import QuizExplanationModal from '@/components/lms/QuizExplanationModal';
import { apiClient } from '@/lib/api/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuizOption {
  text: string;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: QuizOption[];
  order_index: number;
  points: number;
}

interface Quiz {
  id: string;
  title: string;
  pass_percentage: number;
  time_limit_minutes: number | null;
  attempts_allowed: number;
  questions: QuizQuestion[];
}

interface QuizResultData {
  quiz_id: string;
  score_percentage: number;
  passed: boolean;
  correct_count: number;
  total_questions: number;
}

type Phase = 'loading' | 'answering' | 'submitting' | 'result';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function QuizPage() {
  const params = useParams<{ slug: string; quizId: string }>();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('loading');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [result, setResult] = useState<QuizResultData | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Explanation modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalQuestionId, setModalQuestionId] = useState('');

  useEffect(() => {
    apiClient
      .get<Quiz>(`/api/lms/quizzes/${params.quizId}`)
      .then((data) => {
        setQuiz(data);
        setPhase('answering');
      })
      .catch((err: unknown) => {
        setFetchError(err instanceof Error ? err.message : 'Failed to load quiz');
        setPhase('answering');
      });
  }, [params.quizId]);

  const handleSubmit = async (answers: Record<string, number>) => {
    setSubmitError(null);
    setPhase('submitting');
    try {
      const data = await apiClient.post<QuizResultData>(
        `/api/lms/quizzes/${params.quizId}/submit`,
        { answers }
      );
      setResult(data);
      setPhase('result');
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed');
      setPhase('answering');
    }
  };

  const handleRetry = () => {
    setResult(null);
    setSubmitError(null);
    setPhase('answering');
  };

  const openExplanation = (questionId: string) => {
    setModalQuestionId(questionId);
    setModalOpen(true);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-16">
      {/* Back nav */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push(`/courses/${params.slug}`)}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to course
      </Button>

      {/* Header */}
      {quiz && (
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm"
            style={{
              background: 'rgba(36,144,237,0.12)',
              border: '1px solid rgba(36,144,237,0.25)',
            }}
          >
            <ClipboardList className="h-5 w-5" style={{ color: '#2490ed' }} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">{quiz.title}</h1>
            <p className="text-xs text-white/40">
              {quiz.questions.length} question{quiz.questions.length !== 1 ? 's' : ''} &nbsp;·&nbsp;
              Pass at {quiz.pass_percentage}% &nbsp;·&nbsp;
              {quiz.attempts_allowed} attempt{quiz.attempts_allowed !== 1 ? 's' : ''} allowed
            </p>
          </div>
        </div>
      )}

      {/* Phase content */}
      <AnimatePresence mode="wait">
        {phase === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-20"
          >
            <span
              className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-white/10"
              style={{ borderTopColor: '#2490ed' }}
            />
          </motion.div>
        )}

        {fetchError && (
          <motion.div
            key="fetch-error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-sm border border-red-500/20 bg-red-500/8 p-6 text-center"
          >
            <p className="text-sm text-red-400">{fetchError}</p>
          </motion.div>
        )}

        {phase === 'answering' && quiz && !fetchError && (
          <motion.div
            key="answering"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="rounded-sm border p-6"
            style={{ background: '#060a14', borderColor: 'rgba(255,255,255,0.06)' }}
          >
            {submitError && (
              <p className="mb-4 rounded-sm border border-red-500/20 bg-red-500/8 px-3 py-2 text-xs text-red-400">
                {submitError}
              </p>
            )}
            <QuizPlayer quiz={quiz} onSubmit={handleSubmit} />
          </motion.div>
        )}

        {phase === 'submitting' && (
          <motion.div
            key="submitting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center gap-3 py-20"
          >
            <span
              className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-white/10"
              style={{ borderTopColor: '#2490ed' }}
            />
            <p className="text-sm text-white/40">Submitting…</p>
          </motion.div>
        )}

        {phase === 'result' && result && quiz && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="space-y-6"
          >
            {/* Score card */}
            <div
              className="rounded-sm border p-6"
              style={{ background: '#060a14', borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <QuizResult result={result} onRetry={handleRetry} />
            </div>

            {/* Per-question explanations */}
            <div
              className="rounded-sm border p-5"
              style={{ background: '#060a14', borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <p className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-widest text-white/40 uppercase">
                <Lightbulb className="h-3.5 w-3.5" style={{ color: '#2490ed' }} />
                Answer Explanations
              </p>
              <div className="space-y-3">
                {quiz.questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="flex items-start justify-between gap-4 rounded-sm border px-4 py-3"
                    style={{
                      borderColor: 'rgba(255,255,255,0.05)',
                      background: 'rgba(255,255,255,0.02)',
                    }}
                  >
                    <p className="text-sm leading-snug text-white/70">
                      <span className="mr-1.5 text-white/30">{idx + 1}.</span>
                      {q.question_text}
                    </p>
                    <button
                      onClick={() => openExplanation(q.id)}
                      className="shrink-0 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors"
                      style={{
                        background: 'rgba(36,144,237,0.1)',
                        color: '#2490ed',
                        border: '1px solid rgba(36,144,237,0.2)',
                      }}
                    >
                      Explain
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Continue CTA */}
            {result.passed && (
              <Button
                onClick={() => router.push(`/courses/${params.slug}`)}
                className="w-full gap-2 rounded-sm"
                style={{ background: '#2490ed', color: '#fff' }}
              >
                Continue Course
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Explanation modal */}
      <QuizExplanationModal
        questionId={modalQuestionId}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
