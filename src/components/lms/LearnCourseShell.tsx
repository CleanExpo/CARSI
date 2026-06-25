'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Home, Layers, Loader2, Share2 } from 'lucide-react';

import { CampusTopBar } from '@/components/layout/CampusTopBar';
import { CourseCompletionBanner } from '@/components/lms/CourseCompletionBanner';
import { LearnModuleOverview } from '@/components/lms/LearnModuleOverview';
import { LessonPlayer } from '@/components/lms/LessonPlayer';
import { QuizPlayer } from '@/components/lms/QuizPlayer';
import { ProgressSharePrompt } from '@/components/lms/ProgressSharePrompt';
import { Button } from '@/components/ui/button';
import { apiClient, ApiClientError } from '@/lib/api/client';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { applyNoteFormatting, type NoteFormatAction } from '@/lib/lms/note-formatting';
import {
  buildProgressShareDraft,
  type ProgressShareDraft,
  type ProgressShareType,
} from '@/lib/lms/progress-share-post';
import { extractQuizIdFromLesson } from '@/lib/lms/quiz-from-lesson';

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
  course: { id: string; title: string; slug: string; thumbnail_url: string | null };
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
  resources: { label?: string; url?: string }[];
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
      if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(RELIABILITY_TIP_KEY) === '1') {
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
    void loadCurriculum();
  }, [loadCurriculum]);

  useEffect(() => {
    if (!curriculum || flatLessons.length === 0) return;

    const fromLesson = lessonFromQuery && flatLessons.some((l) => l.id === lessonFromQuery);
    const fromModule =
      moduleFromQuery && curriculum.modules.some((m) => m.id === moduleFromQuery);

    if (fromLesson) {
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
    void loadLesson(activeLessonId);
  }, [view, activeLessonId, loadLesson]);

  useEffect(() => {
    if (!lessonDetail) {
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
        }>(`/api/lms/quizzes/${encodeURIComponent(quizData.id)}/attempt`, { answers });
        setQuizResult({ score_percent: res.score_percent, passed: res.passed });
      } catch (e) {
        const msg =
          e instanceof ApiClientError ? e.message : 'Could not submit quiz';
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
    activeIndex >= 0 && activeIndex < flatLessons.length - 1
      ? flatLessons[activeIndex + 1]
      : null;

  async function toggleComplete(completed: boolean) {
    if (!activeLessonId) return;
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
        const targetModule = prev.modules.find((m) => m.lessons.some((l) => l.id === activeLessonId));
        const oldModuleComplete = targetModule
          ? targetModule.lessons.every((l) => l.completed)
          : false;
        const wasLessonComplete =
          targetModule?.lessons.some((l) => l.id === activeLessonId && l.completed) ?? false;

        const next = {
          ...prev,
          modules: prev.modules.map((mod) => ({
            ...mod,
            lessons: mod.lessons.map((l) =>
              l.id === activeLessonId ? { ...l, completed } : l
            ),
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
              ? moduleIndexById.get(nextTargetModule.id) ?? null
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
          `/dashboard/credentials/${encodeURIComponent(certificateEnrollmentId)}?completed=1&course=${encodeURIComponent(slug)}`,
        );
      } else if (nextShare) {
        setShareDraft(nextShare);
        if (nextShareKey) shownShareKeysRef.current.add(nextShareKey);
      }
    } finally {
      setSavingComplete(false);
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
        <p className="text-slate-800">{curriculumError ?? 'Course unavailable'}</p>
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
    <div className="flex w-full min-w-0 max-w-none flex-col gap-6">
      <CampusTopBar
        section="Campus · Learn"
        breadcrumbs={[
          { label: 'My learning', href: '/dashboard/student' },
          { label: curriculum?.course.title ?? 'Course' },
        ]}
      />
      {allLessonsComplete ? (
        <CourseCompletionBanner
          courseTitle={curriculum.course.title}
          enrollmentId={curriculum.enrollment_id}
          courseSlug={curriculum.course.slug}
          onShare={openCourseSharePrompt}
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
            responses and static assets — helpful for patchy field coverage. PDFs and videos cache when
            your browser fetches them.
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
            className="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-[10px] font-medium text-slate-500 uppercase tracking-wide hover:border-slate-300 hover:text-slate-700"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="flex min-h-[calc(100vh-6rem)] w-full max-w-none flex-col gap-8 lg:flex-row lg:gap-10">
      <aside className="w-full shrink-0 lg:w-[min(100%,280px)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-6">
          <div className="mb-5 space-y-2 border-b border-slate-200 pb-4">
            <Link
              href="/dashboard/student"
              className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wider text-[#146fc2] uppercase hover:underline"
            >
              <Home className="h-3.5 w-3.5" aria-hidden />
              My Learning
            </Link>
            <h1 className="text-balance text-lg font-semibold leading-snug text-slate-900">
              {curriculum.course.title}
            </h1>
          </div>
          <nav
            className="max-h-[min(60vh,520px)] space-y-5 overflow-y-auto pr-1 lg:max-h-[calc(100vh-10rem)]"
            aria-label="Course curriculum"
          >
            {curriculum.modules.map((mod, mi) => {
              const modNum = mi + 1;
              const moduleOverviewActive = view === 'module' && activeModuleId === mod.id;
              return (
                <div key={mod.id}>
                  <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
                    <span className="font-mono text-slate-500">M{modNum}</span>
                    <span className="min-w-0 truncate">{mod.title}</span>
                  </p>
                  <div className="mb-2">
                    <button
                      type="button"
                      onClick={() => selectModuleOverview(mod.id)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                        moduleOverviewActive
                          ? 'bg-[#2490ed]/15 text-[#146fc2] ring-1 ring-[#2490ed]/30'
                          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Layers className="h-3.5 w-3.5 shrink-0 text-[#146fc2]" aria-hidden />
                      <span>Module overview</span>
                    </button>
                  </div>
                  <ul className="space-y-0.5 border-l border-slate-200 pl-3">
                    {mod.lessons.map((les) => {
                      const active = view === 'lesson' && les.id === activeLessonId;
                      return (
                        <li key={les.id}>
                          <button
                            type="button"
                            onClick={() => selectLesson(les.id)}
                            className={`flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors ${
                              active
                                ? 'bg-[#2490ed]/15 text-[#146fc2]'
                                : 'text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span className="mt-0.5 shrink-0">
                              {les.completed ? (
                                <Check className="h-4 w-4 text-emerald-400" aria-hidden />
                              ) : (
                                <span className="block h-4 w-4 rounded-full border border-slate-300" />
                              )}
                            </span>
                            <span className="min-w-0 leading-snug">{les.title}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {view === 'module' && activeModuleId && !activeModule ? (
          <p className="rounded-xl border border-slate-200 bg-white px-6 py-8 text-center text-slate-600">
            This module is not part of this course, or the link is out of date.
          </p>
        ) : view === 'module' && activeModule ? (
          <LearnModuleOverview
            courseTitle={curriculum.course.title}
            module={activeModule}
            moduleNumber={moduleIndex}
            totalModules={curriculum.modules.length}
            onSelectLesson={selectLesson}
          />
        ) : view === 'lesson' && activeLessonId ? (
          <>
            {activeModule ? (
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
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
                {loadingQuiz ? (
                  <div className="mb-6 flex items-center gap-2 text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading assessment…
                  </div>
                ) : null}
                {quizData ? (
                  <>
                    <QuizPlayer quiz={quizData} onSubmit={(a) => void submitQuiz(a)} />
                    {quizResult ? (
                      <p
                        className={`mt-6 rounded-lg border px-4 py-3 text-sm ${
                          quizResult.passed
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800'
                            : 'border-amber-500/40 bg-amber-500/10 text-amber-800'
                        }`}
                      >
                        Score: {quizResult.score_percent}% —{' '}
                        {quizResult.passed ? 'Passed' : 'Not passed yet'}
                      </p>
                    ) : null}
                  </>
                ) : (
                <LessonPlayer
                  lesson={lessonDetail.lesson}
                  resources={lessonDetail.resources}
                  footer={
                    <>
                      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-slate-800">My notes</h3>
                          {loadingNote ? (
                            <span className="text-xs text-slate-400">Loading…</span>
                          ) : null}
                        </div>
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          {(
                            [
                              ['heading', 'H'],
                              ['quote', 'Quote'],
                              ['bullet', 'List'],
                              ['bold', 'Bold'],
                              ['italic', 'Italic'],
                            ] as Array<[NoteFormatAction, string]>
                          ).map(([action, label]) => (
                            <button
                              key={action}
                              type="button"
                              onClick={() => applyFormat(action)}
                              className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600 hover:border-slate-300 hover:text-slate-900"
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        <textarea
                          ref={noteEditorRef}
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          rows={5}
                          placeholder="Write your lesson notes here…"
                          className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2490ed]/45 focus:outline-none focus:ring-2 focus:ring-[#2490ed]/20"
                        />
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            onClick={() => void saveLessonNote()}
                            disabled={savingNote || deletingNote || loadingNote}
                            className="h-8 rounded-md bg-[#2490ed] px-3 text-xs text-white hover:bg-[#1e7bc9] disabled:opacity-50"
                          >
                            {savingNote ? 'Saving…' : 'Save note'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => void deleteLessonNote()}
                            disabled={savingNote || deletingNote || loadingNote || !noteText.trim()}
                            className="h-8 border-slate-300 px-3 text-xs text-slate-800"
                          >
                            {deletingNote ? 'Deleting…' : 'Delete note'}
                          </Button>
                          <Link
                            href="/dashboard/student/notes"
                            className="ml-auto text-xs text-[#146fc2] hover:underline"
                          >
                            View all notes
                          </Link>
                        </div>
                        {noteStatus ? <p className="mt-2 text-xs text-slate-500">{noteStatus}</p> : null}
                      </div>
                      <div className="mt-8 flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={!prevLesson}
                            className="gap-1 border-slate-300 text-slate-700"
                            onClick={() => prevLesson && selectLesson(prevLesson.id)}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={!nextLesson}
                            className="gap-1 border-slate-300 text-slate-700"
                            onClick={() => nextLesson && selectLesson(nextLesson.id)}
                          >
                            Next
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                          {currentMeta?.completed ? (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={openLessonSharePrompt}
                              className="gap-1.5 border-[#2490ed]/35 bg-[#2490ed]/10 text-[#146fc2] hover:bg-[#2490ed]/20"
                            >
                              <Share2 className="h-4 w-4" aria-hidden />
                              Share progress
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            disabled={savingComplete || currentMeta?.completed}
                            className="rounded-md bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
                            onClick={() => void toggleComplete(true)}
                          >
                            {currentMeta?.completed ? 'Lesson completed' : 'Mark lesson complete'}
                          </Button>
                        </div>
                      </div>
                    </>
                  }
                />
                )}
              </article>
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
