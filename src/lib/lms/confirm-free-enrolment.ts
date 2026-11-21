import { apiClient } from '@/lib/api/client';

/**
 * Finishes a free (or member-included) self enrolment and returns where the learner should go.
 *
 * `/api/lms/checkout` only answers `{ enrolled: true }` for a free course; it writes no
 * enrolment. The enrolment row exists only once `/api/lms/enrollments/confirm` has run. Every
 * client path that receives `enrolled: true` must call this, so the learner lands on their
 * first lesson rather than an empty dashboard (GP-591).
 *
 * Throws the confirm call's error so the caller can show it.
 */
export async function confirmFreeEnrolment(slug: string): Promise<string> {
  const confirmed = await apiClient.post<{ learn_url?: string }>('/api/lms/enrollments/confirm', {
    slug,
  });
  return confirmed.learn_url ?? '/dashboard/student';
}
