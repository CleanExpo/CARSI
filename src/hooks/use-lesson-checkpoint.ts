'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { CheckpointController, singleLearnerRequest } from '@/lib/lms/checkpoint-controller';
import type { CheckpointState } from '@/lib/lms/checkpoint-controller';
import type { LessonPosition } from '@/lib/lms/lesson-checkpoint';

const unavailable: CheckpointState = { status: 'loading', response: null, draft: null, dirty: false, error: null, hydration: 0 };
const noSubscribe = () => () => {};
const getUnavailable = () => unavailable;

export function useLessonCheckpoint(userId: string | null, lessonId: string | null, kind: LessonPosition['kind']) {
  const controller = useMemo(() => {
    if (!userId || !lessonId) return null;
    let abort = new AbortController();
    const instance = new CheckpointController((method, input) => singleLearnerRequest(
      `/api/lms/lessons/${encodeURIComponent(lessonId)}/checkpoint`, userId, method, input, abort.signal), kind);
    return { instance, connect: () => { abort = new AbortController(); }, disconnect: () => abort.abort() };
  }, [userId, lessonId, kind]);
  const state = useSyncExternalStore(controller?.instance.subscribe ?? noSubscribe,
    controller?.instance.getSnapshot ?? getUnavailable, getUnavailable);
  useEffect(() => {
    if (!controller) return;
    controller.connect();
    controller.instance.activate();
    void controller.instance.load();
    const refresh = () => { if (document.visibilityState === 'visible') void controller.instance.revalidate(); };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (controller.instance.getSnapshot().dirty) { event.preventDefault(); }
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      controller.disconnect(); controller.instance.dispose();
      window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [controller]);
  return { controller: controller?.instance ?? null, state };
}
