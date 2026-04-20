'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Home, Layers, Loader2 } from 'lucide-react';

import { CourseCompletionBanner } from '@/components/lms/CourseCompletionBanner';
import { LearnModuleOverview } from '@/components/lms/LearnModuleOverview';
import { LessonPlayer } from '@/components/lms/LessonPlayer';
import { Button } from '@/components/ui/button';
import { apiClient, ApiClientError } from '@/lib/api/client';
import { useOnlineStatus } from '@/hooks/use-online-status';

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
      setCurriculum((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          modules: prev.modules.map((mod) => ({
            ...mod,
            lessons: mod.lessons.map((l) =>
              l.id === activeLessonId ? { ...l, completed } : l
            ),
          })),
        };
      });
    } finally {
      setSavingComplete(false);
    }
  }

  const currentMeta = flatLessons.find((l) => l.id === activeLessonId);

  if (loadingCurriculum) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-white/60">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading course…
      </div>
    );
  }

  if (curriculumError || !curriculum) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-white/10 bg-white/3 p-8 text-center">
        <p className="text-white/80">{curriculumError ?? 'Course unavailable'}</p>
        <Button asChild variant="outline" className="mt-4 border-white/20 text-white">
          <Link href="/dashboard/student">Back to My Learning</Link>
        </Button>
      </div>
    );
  }

  if (curriculum.modules.length === 0 || flatLessons.length === 0) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-white/10 bg-white/3 p-8 text-center">
        <p className="text-white/80">This course does not have any lessons yet.</p>
        <Button asChild variant="outline" className="mt-4 border-white/20 text-white">
          <Link href="/dashboard/student">Back to My Learning</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 max-w-none flex-col gap-6">
      {allLessonsComplete ? (
        <CourseCompletionBanner
          courseTitle={curriculum.course.title}
          enrollmentId={curriculum.enrollment_id}
        />
      ) : null}

      {!online ? (
        <div
          className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-50/95"
          role="status"
        >
          <span className="font-semibold text-amber-200">You&apos;re offline.</span>{' '}
          <span className="text-amber-100/90">
            Lessons you opened while online may load from your browser cache (PWA). Progress sync
            needs a connection — reconnect when you can.
          </span>
        </div>
      ) : null}

      {online && !reliabilityTipDismissed ? (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/4 px-4 py-3 text-xs leading-relaxed text-white/55">
          <p>
            <span className="font-medium text-white/70">Reliability tip · </span>
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
            className="shrink-0 rounded-md border border-white/15 px-2 py-1 text-[10px] font-medium text-white/50 uppercase tracking-wide hover:border-white/25 hover:text-white/75"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="flex min-h-[calc(100vh-6rem)] w-full max-w-none flex-col gap-8 lg:flex-row lg:gap-10">
      <aside className="w-full shrink-0 lg:w-[min(100%,280px)]">
        <div className="rounded-2xl border border-white/10 bg-white/3 p-4 backdrop-blur-sm lg:sticky lg:top-6">
          <div className="mb-5 space-y-2 border-b border-white/8 pb-4">
            <Link
              href="/dashboard/student"
              className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wider text-[#7ec5ff] uppercase hover:underline"
            >
              <Home className="h-3.5 w-3.5" aria-hidden />
              My Learning
            </Link>
            <h1 className="text-balance text-lg font-semibold leading-snug text-white">
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
                  <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold tracking-widest text-white/40 uppercase">
                    <span className="font-mono text-white/55">M{modNum}</span>
                    <span className="min-w-0 truncate">{mod.title}</span>
                  </p>
                  <div className="mb-2">
                    <button
                      type="button"
                      onClick={() => selectModuleOverview(mod.id)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                        moduleOverviewActive
                          ? 'bg-[#2490ed]/20 text-white ring-1 ring-[#2490ed]/30'
                          : 'text-white/60 hover:bg-white/6 hover:text-white/90'
                      }`}
                    >
                      <Layers className="h-3.5 w-3.5 shrink-0 text-[#7ec5ff]" aria-hidden />
                      <span>Module overview</span>
                    </button>
                  </div>
                  <ul className="space-y-0.5 border-l border-white/10 pl-3">
                    {mod.lessons.map((les) => {
                      const active = view === 'lesson' && les.id === activeLessonId;
                      return (
                        <li key={les.id}>
                          <button
                            type="button"
                            onClick={() => selectLesson(les.id)}
                            className={`flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors ${
                              active
                                ? 'bg-[#2490ed]/20 text-white'
                                : 'text-white/75 hover:bg-white/6'
                            }`}
                          >
                            <span className="mt-0.5 shrink-0">
                              {les.completed ? (
                                <Check className="h-4 w-4 text-emerald-400" aria-hidden />
                              ) : (
                                <span className="block h-4 w-4 rounded-full border border-white/25" />
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
          <p className="rounded-xl border border-white/10 bg-white/3 px-6 py-8 text-center text-white/70">
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
              <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-white/10 pb-4 text-sm text-white/50">
                <span className="rounded-md bg-white/6 px-2 py-0.5 font-mono text-[11px] text-white/70">
                  Module {moduleIndex}
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-40" aria-hidden />
                <span className="min-w-0 font-medium text-white/75">{activeModule.title}</span>
              </div>
            ) : null}

            {loadingLesson && !lessonDetail ? (
              <div className="flex items-center gap-2 text-white/60">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading lesson…
              </div>
            ) : lessonError ? (
              <p className="text-red-300/90">{lessonError}</p>
            ) : lessonDetail ? (
              <article className="rounded-2xl border border-white/8 bg-white/2 p-5 sm:p-8">
                <LessonPlayer
                  lesson={lessonDetail.lesson}
                  resources={lessonDetail.resources}
                  footer={
                    <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={!prevLesson}
                          className="gap-1 border-white/20 text-white"
                          onClick={() => prevLesson && selectLesson(prevLesson.id)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={!nextLesson}
                          className="gap-1 border-white/20 text-white"
                          onClick={() => nextLesson && selectLesson(nextLesson.id)}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button
                        type="button"
                        disabled={savingComplete || currentMeta?.completed}
                        className="rounded-md bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
                        onClick={() => void toggleComplete(true)}
                      >
                        {currentMeta?.completed ? 'Lesson completed' : 'Mark lesson complete'}
                      </Button>
                    </div>
                  }
                />
              </article>
            ) : null}
          </>
        ) : (
          <p className="text-white/50">Select a module or lesson to begin.</p>
        )}
      </div>
      </div>
    </div>
  );
}
