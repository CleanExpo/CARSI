'use client';

import { ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CampusTopBar } from '@/components/layout/CampusTopBar';
import { CourseCompletionBanner } from '@/components/lms/CourseCompletionBanner';
import { LearnerCourseOutline } from '@/components/lms/LearnerCourseOutline';
import { LearnerCourseProgress } from '@/components/lms/LearnerCourseProgress';
import { LearnerLessonNotes } from '@/components/lms/LearnerLessonNotes';
import { LearnModuleOverview } from '@/components/lms/LearnModuleOverview';
import { LessonFooterNav } from '@/components/lms/LessonFooterNav';
import { LessonPlayer } from '@/components/lms/LessonPlayer';
import { ProgressSharePrompt } from '@/components/lms/ProgressSharePrompt';
import { EnterpriseQuizResult, LearnerQuizResult, QuizPlayer } from '@/components/lms/QuizPlayer';
import { EnterpriseLessonFooter } from '@/components/onboarding/EnterpriseLessonFooter';
import { OnboardingCurriculumNav } from '@/components/onboarding/OnboardingCurriculumNav';
import { OnboardingLearnHeader } from '@/components/onboarding/OnboardingLearnHeader';
import { OnboardingModuleOverview } from '@/components/onboarding/OnboardingModuleOverview';
import { Button } from '@/components/ui/button';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { apiClient, ApiClientError } from '@/lib/api/client';
import type { LessonResource } from '@/lib/lms/lesson-resources';
import { applyNoteFormatting, type NoteFormatAction } from '@/lib/lms/note-formatting';
import {
  buildProgressShareDraft,
  type ProgressShareDraft,
  type ProgressShareType,
} from '@/lib/lms/progress-share-post';
import { extractQuizIdFromLesson } from '@/lib/lms/quiz-from-lesson';
import { isOnboardingCourse, parseOnboardingMeta } from '@/lib/onboarding/enterprise';

interface CurriculumLesson {
  id: string;
  title: string;
  order_index: number;
  content_type: string;
  is_preview: boolean;
  completed: boolean;
}

interface CurriculumModule {
  id: string;
  title: string;
  order_index: number;
  lessons: CurriculumLesson[];
}

interface CurriculumResponse {
  course: {
    id: string;
    title: string;
    slug: string;
    thumbnail_url: string | null;
    category?: string | null;
    is_onboarding?: boolean;
    meta?: ReturnType<typeof parseOnboardingMeta>;
  };
  enrollment_id: string;
  modules: CurriculumModule[];
}

interface LessonApiLesson {
  id: string;
  title: string;
  content_type: string;
  content_body: string | null;
  drive_file_id: string | null;
  duration_minutes: number | null;
  is_preview: boolean;
  order_index: number;
  course_id: string;
}

interface LessonDetailResponse {
  lesson: LessonApiLesson;
  resources: LessonResource[];
  enrollment_id: string;
  course: { id: string; slug: string; title: string };
}

interface LessonNoteOut {
  id: string;
  lesson_id: string;
  content: string | null;
}

type ViewMode = 'lesson' | 'module';

const RELIABILITY_TIP_KEY = 'carsi_learn_reliability_tip_dismissed';

export function LearnCourseShell({ slug }: { slug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const online = useOnlineStatus();
  const [reliabilityTipDismissed, setReliabilityTipDismissed] = useState(false);

  useEffect(() => {
    try {
      if (
        typeof sessionStorage !== 'undefined' &&
        sessionStorage.getItem(RELIABILITY_TIP_KEY) === '1'
      ) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing RA-4192 rule promotion; behaviour-preserving suppression, real fix tracked separately
        setReliabilityTipDismissed(true);
      }
    } catch {
      /* private mode */
    }
  }, []);
  const lessonFromQuery = searchParams.get('lesson');
  const moduleFromQuery = searchParams.get('module');

  const [curriculum, setCurriculum] = useState<CurriculumResponse | null>(null);
  const [curriculumError, setCurriculumError] = useState<string | null>(null);
  const [loadingCurriculum, setLoadingCurriculum] = useState(true);

  const [view, setView] = useState<ViewMode>('lesson');
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);

  const [lessonDetail, setLessonDetail] = useState<LessonDetailResponse | null>(null);
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [savingComplete, setSavingComplete] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [loadingNote, setLoadingNote] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [deletingNote, setDeletingNote] = useState(false);
  const [noteStatus, setNoteStatus] = useState<string | null>(null);
  const noteEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const [shareDraft, setShareDraft] = useState<ProgressShareDraft | null>(null);
  const shownShareKeysRef = useRef(new Set<string>());
  const [quizData, setQuizData] = useState<{
    id: string;
    title: string;
    pass_percentage: number;
    time_limit_minutes: number | null;
    attempts_allowed: number;
    attempts_used?: number;
    questions: Array<{
      id: string;
      question_text: string;
      question_type: string;
      options: { text: string }[];
      order_index: number;
      points: number;
    }>;
  } | null>(null);
  const [quizResult, setQuizResult] = useState<{
    score_percent: number;
    passed: boolean;
    pass_percentage?: number;
    correct_count?: number;
    question_count?: number;
    attempts_remaining?: number;
  } | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);

  const flatLessons = useMemo(() => {
    if (!curriculum) return [];
    const list: CurriculumLesson[] = [];
    for (const m of curriculum.modules) {
      for (const l of m.lessons) list.push(l);
    }
    return list;
  }, [curriculum]);

  const allLessonsComplete = useMemo(() => {
    if (flatLessons.length === 0) return false;
    return flatLessons.every((l) => l.completed);
  }, [flatLessons]);

  const moduleByLessonId = useMemo(() => {
    const map = new Map<string, CurriculumModule>();
    if (!curriculum) return map;
    for (const m of curriculum.modules) {
      for (const l of m.lessons) map.set(l.id, m);
    }
    return map;
  }, [curriculum]);

  const activeModule = useMemo(() => {
    if (!curriculum) return null;
    if (view === 'module' && activeModuleId) {
      return curriculum.modules.find((m) => m.id === activeModuleId) ?? null;
    }
    if (view === 'lesson' && activeLessonId) {
      return moduleByLessonId.get(activeLessonId) ?? null;
    }
    return null;
  }, [curriculum, view, activeModuleId, activeLessonId, moduleByLessonId]);

  const moduleIndex = useMemo(() => {
    if (!curriculum || !activeModule) return 0;
    const i = curriculum.modules.findIndex((m) => m.id === activeModule.id);
    return i >= 0 ? i + 1 : 0;
  }, [curriculum, activeModule]);

  const loadCurriculum = useCallback(async () => {
    setLoadingCurriculum(true);
    setCurriculumError(null);
    try {
      const data = await apiClient.get<CurriculumResponse>(
        `/api/lms/courses/${encodeURIComponent(slug)}/curriculum`
      );
      setCurriculum(data);
    } catch (e) {
      const msg =
        e instanceof ApiClientError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Failed to load course';
      setCurriculumError(msg);
      setCurriculum(null);
    } finally {
      setLoadingCurriculum(false);
    }
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing RA-4192 rule promotion; behaviour-preserving suppression, real fix tracked separately
    void loadCurriculum();
  }, [loadCurriculum]);

  useEffect(() => {
    if (!curriculum || flatLessons.length === 0) return;

    const fromLesson = lessonFromQuery && flatLessons.some((l) => l.id === lessonFromQuery);
    const fromModule = moduleFromQuery && curriculum.modules.some((m) => m.id === moduleFromQuery);

    if (fromLesson) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing RA-4192 rule promotion; behaviour-preserving suppression, real fix tracked separately
      setView('lesson');
      setActiveLessonId(lessonFromQuery!);
      setActiveModuleId(null);
      return;
    }
    if (fromModule) {
      setView('module');
      setActiveModuleId(moduleFromQuery!);
      setActiveLessonId(null);
      return;
    }
    setView('lesson');
    setActiveLessonId(flatLessons[0].id);
    setActiveModuleId(null);
  }, [curriculum, lessonFromQuery, moduleFromQuery, flatLessons]);

  const loadLesson = useCallback(async (lessonId: string) => {
    setLoadingLesson(true);
    setLessonError(null);
    try {
      const data = await apiClient.get<LessonDetailResponse>(
        `/api/lms/lessons/${encodeURIComponent(lessonId)}`
      );
      setLessonDetail(data);
      setQuizData(null);
      setQuizResult(null);
    } catch (e) {
      const msg =
        e instanceof ApiClientError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Failed to load lesson';
      setLessonError(msg);
      setLessonDetail(null);
    } finally {
      setLoadingLesson(false);
    }
  }, []);

  useEffect(() => {
    if (view !== 'lesson' || !activeLessonId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing RA-4192 rule promotion; behaviour-preserving suppression, real fix tracked separately
    void loadLesson(activeLessonId);
  }, [view, activeLessonId, loadLesson]);

  useEffect(() => {
    if (!lessonDetail) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing RA-4192 rule promotion; behaviour-preserving suppression, real fix tracked separately
      setQuizData(null);
      return;
    }
    const quizId = extractQuizIdFromLesson(
      lessonDetail.lesson.content_type,
      lessonDetail.lesson.content_body,
      lessonDetail.resources
    );
    if (!quizId) {
      setQuizData(null);
      return;
    }
    setLoadingQuiz(true);
    apiClient
      .get<NonNullable<typeof quizData>>(`/api/lms/quizzes/${encodeURIComponent(quizId)}`)
      .then((data) => setQuizData(data))
      .catch(() => setQuizData(null))
      .finally(() => setLoadingQuiz(false));
  }, [lessonDetail]);

  const submitQuiz = useCallback(
    async (answers: Record<string, number>) => {
      if (!quizData) return;
      try {
        const res = await apiClient.post<{
          score_percent: number;
          passed: boolean;
          pass_percentage?: number;
          correct_count?: number;
          question_count?: number;
          attempts_remaining?: number;
        }>(`/api/lms/quizzes/${encodeURIComponent(quizData.id)}/attempt`, { answers });
        setQuizResult({
          score_percent: res.score_percent,
          passed: res.passed,
          pass_percentage: res.pass_percentage,
          correct_count: res.correct_count,
          question_count: res.question_count,
          attempts_remaining: res.attempts_remaining,
        });
      } catch (e) {
        const msg = e instanceof ApiClientError ? e.message : 'Could not submit quiz';
        setLessonError(msg);
      }
    },
    [quizData]
  );

  const loadLessonNote = useCallback(async (lessonId: string) => {
    setLoadingNote(true);
    setNoteStatus(null);
    try {
      const notes = await apiClient.get<LessonNoteOut[]>('/api/lms/notes/me');
      const current = notes.find((n) => n.lesson_id === lessonId);
      setNoteText(current?.content ?? '');
    } catch {
      setNoteText('');
      setNoteStatus('Could not load note.');
    } finally {
      setLoadingNote(false);
    }
  }, []);

  useEffect(() => {
    if (view !== 'lesson' || !activeLessonId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing RA-4192 rule promotion; behaviour-preserving suppression, real fix tracked separately
    void loadLessonNote(activeLessonId);
  }, [view, activeLessonId, loadLessonNote]);

  function replaceLessonQuery(lessonId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('module');
    params.set('lesson', lessonId);
    router.replace(`/dashboard/learn/${encodeURIComponent(slug)}?${params.toString()}`, {
      scroll: false,
    });
  }

  function replaceModuleQuery(moduleId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('lesson');
    params.set('module', moduleId);
    router.replace(`/dashboard/learn/${encodeURIComponent(slug)}?${params.toString()}`, {
      scroll: false,
    });
  }

  function selectLesson(lessonId: string) {
    setView('lesson');
    setActiveLessonId(lessonId);
    setActiveModuleId(null);
    replaceLessonQuery(lessonId);
  }

  function selectModuleOverview(moduleId: string) {
    setView('module');
    setActiveModuleId(moduleId);
    setActiveLessonId(null);
    setLessonDetail(null);
    replaceModuleQuery(moduleId);
  }

  const activeIndex = useMemo(() => {
    if (!activeLessonId) return -1;
    return flatLessons.findIndex((l) => l.id === activeLessonId);
  }, [activeLessonId, flatLessons]);

  const prevLesson = activeIndex > 0 ? flatLessons[activeIndex - 1] : null;
  const nextLesson =
    activeIndex >= 0 && activeIndex < flatLessons.length - 1 ? flatLessons[activeIndex + 1] : null;

  async function toggleComplete(completed: boolean) {
    if (!activeLessonId) return;
    const lessonToAdvance = completed ? nextLesson : null;
    setCompleteError(null);
    setSavingComplete(true);
    try {
      await apiClient.patch(`/api/lms/lessons/${encodeURIComponent(activeLessonId)}/progress`, {
        completed,
      });
      let nextShare: ProgressShareDraft | null = null;
      let nextShareKey: string | null = null;
      let certificateEnrollmentId: string | null = null;
      setCurriculum((prev) => {
        if (!prev) return prev;
        const oldCourseComplete = prev.modules.every((m) => m.lessons.every((l) => l.completed));
        const moduleIndexById = new Map(prev.modules.map((m, i) => [m.id, i + 1]));
        const targetModule = prev.modules.find((m) =>
          m.lessons.some((l) => l.id === activeLessonId)
        );
        const oldModuleComplete = targetModule
          ? targetModule.lessons.every((l) => l.completed)
          : false;
        const wasLessonComplete =
          targetModule?.lessons.some((l) => l.id === activeLessonId && l.completed) ?? false;

        const next = {
          ...prev,
          modules: prev.modules.map((mod) => ({
            ...mod,
            lessons: mod.lessons.map((l) => (l.id === activeLessonId ? { ...l, completed } : l)),
          })),
        };
        if (completed && !wasLessonComplete) {
          const nextTargetModule =
            next.modules.find((m) => m.lessons.some((l) => l.id === activeLessonId)) ?? null;
          const newModuleComplete = nextTargetModule
            ? nextTargetModule.lessons.every((l) => l.completed)
            : false;
          const newCourseComplete = next.modules.every((m) => m.lessons.every((l) => l.completed));

          if (!oldCourseComplete && newCourseComplete) {
            certificateEnrollmentId = prev.enrollment_id;
          } else {
            const completedLesson = nextTargetModule?.lessons.find((l) => l.id === activeLessonId);
            const lessonTitleForShare = completedLesson?.title ?? '';

            const shareType: ProgressShareType =
              !oldModuleComplete && newModuleComplete ? 'module' : 'lesson';

            const moduleNumber = nextTargetModule
              ? (moduleIndexById.get(nextTargetModule.id) ?? null)
              : null;
            const key =
              shareType === 'module'
                ? `module:${next.course.slug}:${nextTargetModule?.id ?? 'unknown'}`
                : `lesson:${next.course.slug}:${activeLessonId}`;

            if (!shownShareKeysRef.current.has(key)) {
              if (shareType === 'module') {
                nextShare = buildProgressShareDraft({
                  type: 'module',
                  courseTitle: next.course.title,
                  moduleTitle: nextTargetModule?.title ?? null,
                  moduleNumber,
                });
              } else {
                nextShare = buildProgressShareDraft({
                  type: 'lesson',
                  courseTitle: next.course.title,
                  lessonTitle: lessonTitleForShare,
                  moduleTitle: nextTargetModule?.title ?? null,
                  moduleNumber,
                });
              }
              nextShareKey = key;
            }
          }
        }
        return next;
      });
      if (certificateEnrollmentId) {
        router.push(
          `/dashboard/credentials/${encodeURIComponent(certificateEnrollmentId)}?completed=1&course=${encodeURIComponent(slug)}`
        );
      } else {
        if (nextShare) {
          setShareDraft(nextShare);
          if (nextShareKey) shownShareKeysRef.current.add(nextShareKey);
        }
        if (lessonToAdvance) {
          selectLesson(lessonToAdvance.id);
        }
      }
    } catch (e) {
      setCompleteError(
        e instanceof ApiClientError
          ? e.message
          : 'Could not save your progress. Please check your connection and try again.'
      );
    } finally {
      setSavingComplete(false);
    }
  }

  // Completing a quiz lesson. A passed quiz records the lesson as complete
  // (patchLessonProgress) AND advances to the next lesson via toggleComplete —
  // this is the ONLY path that records progress for a quiz lesson, so without it
  // a passed quiz never advances. A failed quiz re-opens for another attempt.
  function handleQuizContinue() {
    if (quizResult?.passed) {
      void toggleComplete(true);
    } else {
      setQuizResult(null);
    }
  }

  function openCourseSharePrompt() {
    if (!curriculum) return;
    setShareDraft(
      buildProgressShareDraft({
        type: 'course',
        courseTitle: curriculum.course.title,
      })
    );
    shownShareKeysRef.current.add(`course:${curriculum.course.slug}`);
  }

  function openLessonSharePrompt() {
    if (!curriculum || !activeLessonId || !lessonDetail) return;
    const lessonTitle =
      flatLessons.find((l) => l.id === activeLessonId)?.title ?? lessonDetail.lesson.title;
    setShareDraft(
      buildProgressShareDraft({
        type: 'lesson',
        courseTitle: curriculum.course.title,
        lessonTitle,
        moduleTitle: activeModule?.title ?? null,
        moduleNumber: moduleIndex > 0 ? moduleIndex : null,
      })
    );
  }

  async function saveLessonNote() {
    if (!activeLessonId || !lessonDetail) return;
    setSavingNote(true);
    setNoteStatus(null);
    try {
      await apiClient.put(`/api/lms/notes/${encodeURIComponent(activeLessonId)}`, {
        content: noteText,
        course_slug: lessonDetail.course.slug,
        course_title: lessonDetail.course.title,
        lesson_title: lessonDetail.lesson.title,
        module_title: activeModule?.title ?? null,
      });
      setNoteStatus('Note saved.');
    } catch {
      setNoteStatus('Failed to save note.');
    } finally {
      setSavingNote(false);
    }
  }

  async function deleteLessonNote() {
    if (!activeLessonId) return;
    setDeletingNote(true);
    setNoteStatus(null);
    try {
      await apiClient.delete(`/api/lms/notes/${encodeURIComponent(activeLessonId)}`);
      setNoteText('');
      setNoteStatus('Note deleted.');
    } catch {
      setNoteStatus('Failed to delete note.');
    } finally {
      setDeletingNote(false);
    }
  }

  function applyFormat(action: NoteFormatAction) {
    const el = noteEditorRef.current;
    const start = el?.selectionStart ?? noteText.length;
    const end = el?.selectionEnd ?? noteText.length;
    const next = applyNoteFormatting(noteText, start, end, action);
    setNoteText(next.value);
    requestAnimationFrame(() => {
      noteEditorRef.current?.focus();
      noteEditorRef.current?.setSelectionRange(next.selectionStart, next.selectionEnd);
    });
  }

  const currentMeta = flatLessons.find((l) => l.id === activeLessonId);

  const lessonPosition = useMemo(() => {
    if (!activeLessonId || flatLessons.length === 0) return null;
    const idx = flatLessons.findIndex((l) => l.id === activeLessonId);
    return idx >= 0 ? { current: idx + 1, total: flatLessons.length } : null;
  }, [activeLessonId, flatLessons]);

  const moduleLessonPosition = useMemo(() => {
    if (!activeModule || !activeLessonId) return null;
    const idx = activeModule.lessons.findIndex((l) => l.id === activeLessonId);
    return idx >= 0 ? { current: idx + 1, total: activeModule.lessons.length } : null;
  }, [activeModule, activeLessonId]);

  const isOnboardingProgram =
    curriculum?.course.is_onboarding ??
    (curriculum
      ? isOnboardingCourse({
          slug: curriculum.course.slug,
          category: curriculum.course.category,
          meta: curriculum.course.meta,
        })
      : false);

  const courseProgress = useMemo(() => {
    if (!curriculum) return { percent: 0, done: 0, total: 0 };
    const total = curriculum.modules.reduce((s, m) => s + m.lessons.length, 0);
    const done = curriculum.modules.reduce(
      (s, m) => s + m.lessons.filter((l) => l.completed).length,
      0
    );
    return { percent: total > 0 ? Math.round((done / total) * 100) : 0, done, total };
  }, [curriculum]);
  const onboardingProgressPct = courseProgress.percent;

  if (loadingCurriculum) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading course…
      </div>
    );
  }

  if (curriculumError || !curriculum) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-slate-800">We could not load this course.</p>
        <Button asChild variant="outline" className="mt-4 border-slate-300 text-slate-700">
          <Link href="/dashboard/student">Back to My Learning</Link>
        </Button>
      </div>
    );
  }

  if (curriculum.modules.length === 0 || flatLessons.length === 0) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-slate-800">This course does not have any lessons yet.</p>
        <Button asChild variant="outline" className="mt-4 border-slate-300 text-slate-700">
          <Link href="/dashboard/student">Back to My Learning</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-none min-w-0 flex-col gap-6">
      {isOnboardingProgram ? (
        <CampusTopBar
          section="Onboarding · Learn"
          breadcrumbs={[
            { label: 'Onboarding', href: '/dashboard/onboarding' },
            {
              label: curriculum.course.title.replace(
                /^CARSI Maintenance Company Onboarding — /,
                ''
              ),
              href: `/dashboard/onboarding/${curriculum.course.slug}`,
            },
            { label: 'Training' },
          ]}
        />
      ) : (
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href={`/dashboard/courses/${encodeURIComponent(curriculum.course.slug)}`}
              className="text-sm font-medium text-[#146fc2] hover:underline"
            >
              ← {curriculum.course.title}
            </Link>
            {lessonPosition ? (
              <p className="mt-2 text-sm text-slate-500">
                Lesson {lessonPosition.current} of {lessonPosition.total}
              </p>
            ) : null}
          </div>
          <LearnerCourseProgress
            percent={courseProgress.percent}
            done={courseProgress.done}
            total={courseProgress.total}
          />
        </header>
      )}
      {isOnboardingProgram ? (
        <OnboardingLearnHeader
          company={curriculum.course.meta?.company}
          programName={curriculum.course.meta?.program}
          pricing={curriculum.course.meta?.pricing}
          progressPercent={onboardingProgressPct}
          hubHref={`/dashboard/onboarding/${curriculum.course.slug}`}
        />
      ) : null}
      {allLessonsComplete ? (
        <CourseCompletionBanner
          courseTitle={curriculum.course.title}
          enrollmentId={curriculum.enrollment_id}
          courseSlug={curriculum.course.slug}
          onShare={openCourseSharePrompt}
          variant={isOnboardingProgram ? 'enterprise' : 'default'}
        />
      ) : null}
      <ProgressSharePrompt draft={shareDraft} onClose={() => setShareDraft(null)} />

      {!online ? (
        <div
          className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-900"
          role="status"
        >
          <span className="font-semibold text-amber-800">You&apos;re offline.</span>{' '}
          <span className="text-amber-800/90">
            Lessons you opened while online may load from your browser cache (PWA). Progress sync
            needs a connection — reconnect when you can.
          </span>
        </div>
      ) : null}

      {online && !reliabilityTipDismissed ? (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500">
          <p>
            <span className="font-medium text-slate-600">Reliability tip · </span>
            Open each lesson once while you have signal so your installed PWA can cache lesson API
            responses and static assets — helpful for patchy field coverage. PDFs and videos cache
            when your browser fetches them.
          </p>
          <button
            type="button"
            onClick={() => {
              try {
                sessionStorage.setItem(RELIABILITY_TIP_KEY, '1');
              } catch {
                /* ignore */
              }
              setReliabilityTipDismissed(true);
            }}
            className="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-[10px] font-medium tracking-wide text-slate-500 uppercase hover:border-slate-300 hover:text-slate-700"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="flex min-h-[calc(100vh-6rem)] w-full max-w-none flex-col gap-8 lg:flex-row lg:gap-10">
        <aside className="w-full shrink-0 lg:w-[min(100%,300px)]">
          {isOnboardingProgram ? (
            <OnboardingCurriculumNav
              courseSlug={curriculum.course.slug}
              courseTitle={curriculum.course.title}
              modules={curriculum.modules.map((m) => ({
                id: m.id,
                title: m.title,
                lessons: m.lessons.map((l) => ({
                  id: l.id,
                  title: l.title,
                  completed: l.completed,
                  content_type: l.content_type,
                })),
              }))}
              activeLessonId={activeLessonId}
              activeModuleId={activeModuleId}
              view={view}
              onSelectLesson={selectLesson}
              onSelectModule={selectModuleOverview}
            />
          ) : (
            <LearnerCourseOutline
              modules={curriculum.modules}
              activeLessonId={activeLessonId}
              onSelectLesson={selectLesson}
              onSelectModule={selectModuleOverview}
            />
          )}
        </aside>

        <div className="min-w-0 flex-1">
          {view === 'module' && activeModuleId && !activeModule ? (
            <p className="rounded-xl border border-slate-200 bg-white px-6 py-8 text-center text-slate-600">
              This module is not part of this course, or the link is out of date.
            </p>
          ) : view === 'module' && activeModule ? (
            isOnboardingProgram ? (
              <OnboardingModuleOverview
                courseTitle={curriculum.course.title}
                module={{
                  ...activeModule,
                  lessons: activeModule.lessons.map((l) => ({
                    ...l,
                    content_type: l.content_type,
                  })),
                }}
                moduleNumber={moduleIndex}
                totalModules={curriculum.modules.length}
                onSelectLesson={selectLesson}
              />
            ) : (
              <LearnModuleOverview
                courseTitle={curriculum.course.title}
                module={activeModule}
                moduleNumber={moduleIndex}
                totalModules={curriculum.modules.length}
                onSelectLesson={selectLesson}
              />
            )
          ) : view === 'lesson' && activeLessonId ? (
            <>
              {!isOnboardingProgram && activeModule ? (
                <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4 text-sm text-slate-500">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600">
                    Module {moduleIndex}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-40" aria-hidden />
                  <span className="min-w-0 font-medium text-slate-700">{activeModule.title}</span>
                </div>
              ) : null}

              {loadingLesson && !lessonDetail ? (
                <div className="flex items-center gap-2 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading lesson…
                </div>
              ) : lessonError ? (
                <p className="text-red-600">{lessonError}</p>
              ) : lessonDetail ? (
                <>
                  <article
                    className={
                      isOnboardingProgram
                        ? 'min-w-0'
                        : 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8'
                    }
                  >
                    {loadingQuiz ? (
                      <div className="mb-6 flex items-center gap-2 text-slate-500">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Loading assessment…
                      </div>
                    ) : null}
                    {quizData ? (
                      <>
                        {!quizResult ? (
                          <QuizPlayer
                            quiz={quizData}
                            variant={isOnboardingProgram ? 'enterprise' : 'default'}
                            // Return the promise, do NOT `void` it. `void submitQuiz(a)` discards
                            // the promise, so QuizPlayer's `await onSubmit(...)` resolved instantly
                            // and its in-flight double-submit guard protected a near-zero window —
                            // which is the whole point of the guard, since a quiz allows 3 attempts
                            // and one double-click on a slow connection spends two of them.
                            onSubmit={(a) => submitQuiz(a)}
                          />
                        ) : null}
                        {quizResult ? (
                          isOnboardingProgram ? (
                            // WS1 fix 5 (GP-544): every completion action clears Margot; see LessonFooterNav.
                            <div className="lesson-footer-nav mt-6 pb-24">
                              <EnterpriseQuizResult
                                passed={quizResult.passed}
                                scorePercent={quizResult.score_percent}
                                passPercentage={quizData.pass_percentage}
                                onContinue={handleQuizContinue}
                              />
                              {completeError ? (
                                <p role="alert" className="mt-2 text-sm text-red-600">
                                  {completeError}
                                </p>
                              ) : null}
                            </div>
                          ) : (
                            // WS1 fix 5 (GP-544): every completion action clears Margot; see LessonFooterNav.
                            <div className="lesson-footer-nav mt-6 space-y-3 pb-24">
                              <LearnerQuizResult
                                passed={quizResult.passed}
                                scorePercent={quizResult.score_percent}
                                passPercentage={
                                  quizResult.pass_percentage ?? quizData.pass_percentage
                                }
                                correctCount={quizResult.correct_count}
                                questionCount={
                                  quizResult.question_count ?? quizData.questions.length
                                }
                                attemptsRemaining={quizResult.attempts_remaining}
                                saving={savingComplete}
                                onContinue={handleQuizContinue}
                                onReview={
                                  prevLesson ? () => selectLesson(prevLesson.id) : undefined
                                }
                              />
                              {completeError ? (
                                <p role="alert" className="text-sm text-red-600">
                                  {completeError}
                                </p>
                              ) : null}
                            </div>
                          )
                        ) : null}
                      </>
                    ) : (
                      <LessonPlayer
                        lesson={lessonDetail.lesson}
                        resources={lessonDetail.resources}
                        variant={isOnboardingProgram ? 'enterprise' : 'default'}
                        moduleTitle={activeModule?.title}
                        completed={currentMeta?.completed}
                        lessonNumber={lessonPosition?.current}
                        totalLessons={lessonPosition?.total}
                        moduleLessonNumber={moduleLessonPosition?.current}
                        moduleLessonTotal={moduleLessonPosition?.total}
                        courseProgressPercent={isOnboardingProgram ? onboardingProgressPct : null}
                        footer={
                          isOnboardingProgram ? (
                            <EnterpriseLessonFooter
                              noteText={noteText}
                              onNoteChange={setNoteText}
                              noteEditorRef={noteEditorRef}
                              onFormat={applyFormat}
                              onSaveNote={() => void saveLessonNote()}
                              onDeleteNote={() => void deleteLessonNote()}
                              loadingNote={loadingNote}
                              savingNote={savingNote}
                              deletingNote={deletingNote}
                              noteStatus={noteStatus}
                              onPrevious={() => prevLesson && selectLesson(prevLesson.id)}
                              onNext={() => nextLesson && selectLesson(nextLesson.id)}
                              hasPrevious={Boolean(prevLesson)}
                              hasNext={Boolean(nextLesson)}
                              onShare={openLessonSharePrompt}
                              showShare={Boolean(currentMeta?.completed)}
                              onComplete={() => void toggleComplete(true)}
                              savingComplete={savingComplete}
                              completed={Boolean(currentMeta?.completed)}
                            />
                          ) : null
                        }
                      />
                    )}
                  </article>
                  {!isOnboardingProgram && !quizData ? (
                    <>
                      <LessonFooterNav
                        hasPrev={Boolean(prevLesson)}
                        hasNext={Boolean(nextLesson)}
                        onPrev={() => prevLesson && selectLesson(prevLesson.id)}
                        onNext={() => nextLesson && selectLesson(nextLesson.id)}
                        completed={Boolean(currentMeta?.completed)}
                        saving={savingComplete}
                        onComplete={() => void toggleComplete(true)}
                        onShare={openLessonSharePrompt}
                        error={completeError}
                      />
                      <LearnerLessonNotes
                        noteText={noteText}
                        onNoteChange={setNoteText}
                        noteEditorRef={noteEditorRef}
                        onFormat={applyFormat}
                        onSaveNote={() => void saveLessonNote()}
                        onDeleteNote={() => void deleteLessonNote()}
                        loadingNote={loadingNote}
                        savingNote={savingNote}
                        deletingNote={deletingNote}
                        noteStatus={noteStatus}
                      />
                    </>
                  ) : null}
                </>
              ) : null}
            </>
          ) : (
            <p className="text-slate-500">Select a module or lesson to begin.</p>
          )}
        </div>
      </div>
    </div>
  );
}
