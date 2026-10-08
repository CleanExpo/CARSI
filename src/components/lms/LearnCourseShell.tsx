'use client';

import { AlertCircle, Check, ChevronRight, Cloud, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { useLessonCheckpoint } from '@/hooks/use-lesson-checkpoint';
import { singleLearnerRequest } from '@/lib/lms/checkpoint-controller';

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
    delivery_profile?: { profileId: string; totalMinutes: number; sessions: Array<{ sessionId: string; objective: string; plannedMinutes: number; readingLessonId: string; assessmentLessonId: string }> } | null;
  };
  enrollment_id: string;
  modules: CurriculumModule[];
  resume_lesson_id?: string | null;
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

export function LearnCourseShell({ slug }: { slug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const online = useOnlineStatus();
  const { user, loading: loadingIdentity, refreshUser } = useAuth();
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const submissionLock = useRef(false);
  const completionLock = useRef(false);
  const resetLock = useRef(false);
  const [resettingDraft, setResettingDraft] = useState(false);
  const [unknownResultKey, setUnknownResultKey] = useState<string | null>(null);
  const lessonFromQuery = searchParams.get('lesson');
  const moduleFromQuery = searchParams.get('module');

  const [curriculum, setCurriculum] = useState<CurriculumResponse | null>(null);
  const [curriculumError, setCurriculumError] = useState<string | null>(null);
  const [loadingCurriculum, setLoadingCurriculum] = useState(true);

  const [view, setView] = useState<ViewMode>('lesson');
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);

  const [legacyLessonDetail, setLessonDetail] = useState<(LessonDetailResponse & { learner_id: string }) | null>(null);
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
  const [legacyQuizData, setQuizData] = useState<{
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
    userId: string;
    lessonId: string;
    contentVersion?: string;
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

  const selectedLesson = flatLessons.find((lesson) => lesson.id === activeLessonId);
  const matchingLegacyDetail = legacyLessonDetail?.lesson.id === activeLessonId && legacyLessonDetail?.learner_id === user?.id ? legacyLessonDetail : null;
  const associatedQuiz = matchingLegacyDetail ? extractQuizIdFromLesson(matchingLegacyDetail.lesson.content_type,
    matchingLegacyDetail.lesson.content_body, matchingLegacyDetail.resources) : null;
  const supportedCheckpoint = view === 'lesson' && (['text', 'video', 'quiz'].includes(selectedLesson?.content_type ?? '') || Boolean(associatedQuiz));
  const checkpoint = useLessonCheckpoint(loadingIdentity ? null : user?.id ?? null,
    supportedCheckpoint ? activeLessonId : null,
    selectedLesson?.content_type === 'quiz' || associatedQuiz ? 'quiz' : selectedLesson?.content_type === 'video' ? 'video' : 'reading');
  const checkpointReady = Boolean(user && checkpoint.state.draft && checkpoint.state.response &&
    checkpoint.state.response.content.lesson.id === activeLessonId &&
    !['loading', 'conflict'].includes(checkpoint.state.status));
  const lessonDetail = useMemo(() => supportedCheckpoint ? checkpointReady && checkpoint.state.response ?
    { ...checkpoint.state.response.content, enrollment_id: curriculum?.enrollment_id ?? '' } : null : matchingLegacyDetail,
    [supportedCheckpoint, checkpointReady, checkpoint.state.response, curriculum?.enrollment_id, matchingLegacyDetail]);
  const quizData = supportedCheckpoint ? checkpointReady ? checkpoint.state.response?.content.quiz ?? null : null : legacyQuizData;
  const currentPass = supportedCheckpoint && checkpoint.state.response?.passedAttempt?.versionVerified ? checkpoint.state.response.passedAttempt : null;
  const learnerScope = `${user?.id ?? ''}:${activeLessonId ?? ''}:${checkpoint.state.response?.contentVersion ?? 'legacy'}`;
  const currentScope = useRef(learnerScope);
  useLayoutEffect(() => { currentScope.current = learnerScope; }, [learnerScope]);
  const unknownQuizResult = unknownResultKey === learnerScope;
  const scopedQuizResult = quizResult?.userId === user?.id && quizResult?.lessonId === activeLessonId &&
    (!supportedCheckpoint || quizResult.contentVersion === checkpoint.state.response?.contentVersion) ? quizResult : null;
  const displayedQuizResult: Omit<NonNullable<typeof quizResult>, 'userId' | 'lessonId' | 'contentVersion'> | null = scopedQuizResult ??
    (currentPass ? { score_percent: currentPass.scorePercent, passed: true } : null);

  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') void refreshUser(); };
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [refreshUser]);

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
    setActiveLessonId(flatLessons.some((lesson) => lesson.id === curriculum.resume_lesson_id) ? curriculum.resume_lesson_id! : flatLessons[0].id);
    setActiveModuleId(null);
  }, [curriculum, lessonFromQuery, moduleFromQuery, flatLessons]);

  const loadLesson = useCallback(async (lessonId: string) => {
    if (!user) return;
    const learnerId = user.id;
    setLoadingLesson(true);
    setLessonError(null);
    try {
      const data = await apiClient.get<LessonDetailResponse>(
        `/api/lms/lessons/${encodeURIComponent(lessonId)}`
      );
      if (!currentScope.current.startsWith(`${learnerId}:${lessonId}:`)) return;
      setLessonDetail({ ...data, learner_id: learnerId });
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
  }, [user]);

  useEffect(() => {
    if (view !== 'lesson' || !activeLessonId || supportedCheckpoint) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing RA-4192 rule promotion; behaviour-preserving suppression, real fix tracked separately
    void loadLesson(activeLessonId);
  }, [view, activeLessonId, loadLesson, supportedCheckpoint]);

  useEffect(() => {
    if (supportedCheckpoint) return;
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
      .get<NonNullable<typeof legacyQuizData>>(`/api/lms/quizzes/${encodeURIComponent(quizId)}`)
      .then((data) => setQuizData(data))
      .catch(() => setQuizData(null))
      .finally(() => setLoadingQuiz(false));
  }, [lessonDetail, supportedCheckpoint]);

  const submitQuiz = useCallback(
    async (answers: Record<string, number>) => {
      if (!quizData || !user || !activeLessonId || !supportedCheckpoint || !checkpointReady || submissionLock.current || resetLock.current || unknownQuizResult) return;
      submissionLock.current = true; setSubmittingQuiz(true);
      const scope = learnerScope;
      try {
        if (supportedCheckpoint && !await checkpoint.controller?.flush()) return;
        if (currentScope.current !== scope) return;
        const res = await singleLearnerRequest<{
          score_percent: number;
          passed: boolean;
          pass_percentage?: number;
          correct_count?: number;
          question_count?: number;
          attempts_remaining?: number;
        }>(`/api/lms/quizzes/${encodeURIComponent(quizData.id)}/attempt`, user.id, 'POST',
          { answers, lessonId: activeLessonId, contentVersion: checkpoint.state.response?.contentVersion });
        if (currentScope.current !== scope) return;
        setQuizResult({ ...res, score_percent: res.score_percent, passed: res.passed, userId: user.id,
          lessonId: activeLessonId, contentVersion: checkpoint.state.response?.contentVersion });
      } catch {
        if (currentScope.current !== scope) return;
        setUnknownResultKey(scope);
        setCompleteError('Assessment result is not confirmed. Check for a saved pass; do not submit again.');
        await checkpoint.controller?.load();
      } finally {
        submissionLock.current = false; setSubmittingQuiz(false);
      }
    },
    [quizData, user, activeLessonId, supportedCheckpoint, checkpointReady, checkpoint.controller, checkpoint.state.response, unknownQuizResult, learnerScope]
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

  async function canNavigate() {
    if (submissionLock.current || completionLock.current || resetLock.current) return false;
    const scope = learnerScope;
    const success = !supportedCheckpoint || Boolean(await checkpoint.controller?.flush());
    return success && currentScope.current === scope;
  }

  async function resetDraft() {
    const controller = checkpoint.controller;
    if (!controller || !user || !activeLessonId || resetLock.current || submissionLock.current || completionLock.current) return;
    if (!window.confirm('Discard your local and latest saved draft, and reset this lesson to its current content?')) return;
    resetLock.current = true; setResettingDraft(true);
    const identity = `${user.id}:${activeLessonId}:`;
    try {
      const hydration = controller.getSnapshot().hydration;
      await controller.load(true);
      if (currentScope.current.startsWith(identity) && controller.getSnapshot().hydration > hydration) await controller.reset();
    } finally { resetLock.current = false; setResettingDraft(false); }
  }

  async function selectLesson(lessonId: string) {
    if (!await canNavigate()) return;
    setQuizResult(null); setUnknownResultKey(null); setCompleteError(null);
    setView('lesson');
    setActiveLessonId(lessonId);
    setActiveModuleId(null);
    replaceLessonQuery(lessonId);
  }

  async function selectModuleOverview(moduleId: string) {
    if (!await canNavigate()) return;
    setQuizResult(null); setUnknownResultKey(null);
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
    if (!activeLessonId || !user || completionLock.current || submissionLock.current || resetLock.current) return;
    completionLock.current = true;
    const scope = learnerScope;
    if ((supportedCheckpoint && !await checkpoint.controller?.flush()) || currentScope.current !== scope) { completionLock.current = false; return; }
    const lessonToAdvance = completed ? nextLesson : null;
    setCompleteError(null);
    setSavingComplete(true);
    try {
      await singleLearnerRequest(`/api/lms/lessons/${encodeURIComponent(activeLessonId)}/progress`, user.id, 'PATCH', {
        completed,
      });
      if (currentScope.current !== scope) return;
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
          completionLock.current = false;
          void selectLesson(lessonToAdvance.id);
        }
      }
    } catch (e) {
      if (currentScope.current !== scope) return;
      setCompleteError(
        e instanceof ApiClientError
          ? e.message
          : 'Could not save your progress. Please check your connection and try again.'
      );
      // A lost acknowledgement must not replay completion. Refresh read-only state instead.
      void loadCurriculum();
    } finally {
      completionLock.current = false;
      setSavingComplete(false);
    }
  }

  // Completing a quiz lesson. A passed quiz records the lesson as complete
  // (patchLessonProgress) AND advances to the next lesson via toggleComplete —
  // this is the ONLY path that records progress for a quiz lesson, so without it
  // a passed quiz never advances. A failed quiz re-opens for another attempt.
  function handleQuizContinue() {
    if (displayedQuizResult?.passed) {
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
      <div className="learner-home-surface mx-auto max-w-lg rounded-[1.25rem] p-8 text-center">
        <p className="text-white">We could not load this course.</p>
        <Button asChild variant="outline" className="mt-4 border-white/20 bg-transparent text-sky-100 hover:bg-white/10">
          <Link href="/dashboard/student">Back to My Learning</Link>
        </Button>
      </div>
    );
  }

  if (curriculum.modules.length === 0 || flatLessons.length === 0) {
    return (
      <div className="learner-home-surface mx-auto max-w-lg rounded-[1.25rem] p-8 text-center">
        <p className="text-white">This course does not have any lessons yet.</p>
        <Button asChild variant="outline" className="mt-4 border-white/20 bg-transparent text-sky-100 hover:bg-white/10">
          <Link href="/dashboard/student">Back to My Learning</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="learner-home flex w-full max-w-none min-w-0 flex-col gap-6"
      onClickCapture={(event) => {
        const anchor = (event.target as HTMLElement).closest('a');
        const href = anchor?.getAttribute('href');
        if (!supportedCheckpoint || !href?.startsWith('/') || anchor?.target === '_blank') return;
        event.preventDefault();
        void (async () => { if (await canNavigate()) router.push(href); })();
      }}>
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
            Checkpoint saves and lesson access need a connection. Unsaved changes stay in this open page only.
          </span>
        </div>
      ) : null}

      {supportedCheckpoint ? (
        <div className="flex flex-wrap items-center gap-3 border-y border-slate-200 py-3 text-sm text-slate-800" data-testid="checkpoint-controls">
          <span role="status" aria-live="polite" className="inline-flex items-center gap-2">
            {resettingDraft || checkpoint.state.status === 'saving' || checkpoint.state.status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> :
              ['error', 'conflict'].includes(checkpoint.state.status) ? <AlertCircle className="h-4 w-4 text-amber-700" aria-hidden /> :
                checkpoint.state.status === 'saved' ? <Check className="h-4 w-4 text-emerald-700" aria-hidden /> : <Cloud className="h-4 w-4" aria-hidden />}
            {resettingDraft ? 'Resetting draft' : checkpoint.state.status === 'loading' ? 'Loading checkpoint' : checkpoint.state.status === 'saved' ? 'Saved' : checkpoint.state.status === 'pending' ? 'Pending save' : checkpoint.state.status === 'saving' ? 'Saving' : checkpoint.state.status === 'conflict' ? 'Checkpoint conflict' : 'Save not confirmed'}
          </span>
          <Button type="button" variant="outline" disabled={!checkpointReady || submittingQuiz || savingComplete || resettingDraft}
            onClick={() => { void (async () => { if (await checkpoint.controller?.flush()) router.push('/dashboard/student'); })(); }} className="gap-2">
            <Save className="h-4 w-4" aria-hidden />Save and pause
          </Button>
          {checkpoint.state.status === 'error' ? <Button variant="outline" onClick={() => { void (checkpoint.state.response ? checkpoint.controller?.flush() : checkpoint.controller?.load()); }}>{checkpoint.state.response ? 'Save again' : 'Retry checkpoint'}</Button> : null}
          {checkpoint.state.response?.content.lesson.content_type === 'video' && /(?:youtube(?:-nocookie)?\.com|youtu\.be|vimeo\.com)/i.test(checkpoint.state.response.content.lesson.content_body ?? '') ? <p className="w-full text-sm text-slate-700">Playback position is not saved for embedded video.</p> : null}
          {checkpoint.state.status === 'conflict' ? <>
            <Button variant="outline" onClick={() => { if (window.confirm('Discard your unsaved draft and load the saved checkpoint?')) void checkpoint.controller?.load(true); }}>Discard and reload</Button>
          </> : null}
          {checkpoint.state.response && !['loading', 'saving'].includes(checkpoint.state.status) ? <Button variant="outline" disabled={resettingDraft || submittingQuiz || savingComplete} onClick={() => { void resetDraft(); }}>Reset draft</Button> : null}
          {checkpoint.state.error ? <p role="alert" className="w-full text-sm text-red-700">{checkpoint.state.error}</p> : null}
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
          {curriculum.course.delivery_profile && activeLessonId ? (() => {
            const profile = curriculum.course.delivery_profile;
            const index = profile.sessions.findIndex((session) => session.readingLessonId === activeLessonId || session.assessmentLessonId === activeLessonId);
            return index >= 0 ? <p className="mb-4 text-sm font-medium text-slate-700">Session {index + 1} of {profile.sessions.length} · {profile.sessions[index].plannedMinutes} min · Course {profile.totalMinutes} min</p> : null;
          })() : null}
          {view === 'module' && activeModuleId && !activeModule ? (
            <p className="learner-home-surface rounded-[1.25rem] px-6 py-8 text-center text-slate-300">
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

              {(supportedCheckpoint ? checkpoint.state.status === 'loading' : loadingLesson) && !lessonDetail ? (
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
                        : 'overflow-hidden rounded-[1.25rem] border border-sky-200/20 bg-white p-5 shadow-[0_24px_52px_-26px_rgba(14,116,184,0.38)] sm:p-8'
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
                        {checkpoint.state.response?.passedAttempt && !checkpoint.state.response.passedAttempt.versionVerified ? <p role="status" className="mb-4 text-sm text-slate-700">Historical assessment pass ({checkpoint.state.response.passedAttempt.scorePercent}%). Not verified against this lesson version.</p> : null}
                        {unknownQuizResult && !currentPass ? <div role="alert" className="mb-4 text-sm text-amber-800">Assessment result unknown. An attempt may have been consumed. <Button variant="outline" onClick={() => { void checkpoint.controller?.revalidate(); }}>Check saved result</Button></div> : null}
                        {!displayedQuizResult ? (
                          <QuizPlayer
                            key={`${learnerScope}:${checkpoint.state.hydration}`}
                            quiz={quizData}
                            initialDraft={checkpoint.state.draft ? { answers: checkpoint.state.draft.answers, activeIndex: checkpoint.state.draft.position.value } : undefined}
                            onDraftChange={(draft) => checkpoint.controller?.update({ answers: draft.answers, position: { kind: 'quiz', value: draft.activeIndex } })}
                            disabled={submittingQuiz || unknownQuizResult || savingComplete || resettingDraft || (supportedCheckpoint && !checkpointReady)}
                            variant={isOnboardingProgram ? 'enterprise' : 'default'}
                            // Return the promise, do NOT `void` it. `void submitQuiz(a)` discards
                            // the promise, so QuizPlayer's `await onSubmit(...)` resolved instantly
                            // and its in-flight double-submit guard protected a near-zero window —
                            // which is the whole point of the guard, since a quiz allows 3 attempts
                            // and one double-click on a slow connection spends two of them.
                            onSubmit={(a) => submitQuiz(a)}
                          />
                        ) : null}
                        {displayedQuizResult ? (
                          isOnboardingProgram ? (
                            // WS1 fix 5 (GP-544): every completion action clears Margot; see LessonFooterNav.
                            <div className="lesson-footer-nav mt-6 pb-24">
                              <EnterpriseQuizResult
                                passed={displayedQuizResult.passed}
                                scorePercent={displayedQuizResult.score_percent}
                                passPercentage={quizData.pass_percentage}
                                onContinue={handleQuizContinue}
                                loading={savingComplete}
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
                                passed={displayedQuizResult.passed}
                                scorePercent={displayedQuizResult.score_percent}
                                passPercentage={
                                  displayedQuizResult.pass_percentage ?? quizData.pass_percentage
                                }
                                correctCount={displayedQuizResult.correct_count}
                                questionCount={
                                  displayedQuizResult.question_count ?? quizData.questions.length
                                }
                                attemptsRemaining={displayedQuizResult.attempts_remaining}
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
                        key={`${learnerScope}:${checkpoint.state.hydration}`}
                        initialPosition={checkpoint.state.draft?.position}
                        onPositionChange={(position) => { if (checkpoint.state.draft) checkpoint.controller?.update({ position, answers: checkpoint.state.draft.answers }); }}
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
