import { beforeEach, describe, expect, it, vi } from 'vitest';

const post = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', () => ({ apiClient: { post } }));

import { confirmFreeEnrolment } from './confirm-free-enrolment';

describe('confirmFreeEnrolment (GP-591)', () => {
  // Block body: a function returned from beforeEach is run as teardown, and mockReset returns the mock.
  beforeEach(() => {
    post.mockReset();
  });

  it('writes the enrolment through the confirm route and returns the first-lesson URL', async () => {
    post.mockResolvedValue({ learn_url: '/dashboard/learn/intro/lesson-1' });
    await expect(confirmFreeEnrolment('intro')).resolves.toBe('/dashboard/learn/intro/lesson-1');
    expect(post).toHaveBeenCalledWith('/api/lms/enrollments/confirm', { slug: 'intro' });
  });

  it('falls back to the learner dashboard when the route gives no learn_url', async () => {
    post.mockResolvedValue({});
    await expect(confirmFreeEnrolment('intro')).resolves.toBe('/dashboard/student');
  });

  it('surfaces a failed confirm to the caller instead of pretending to succeed', async () => {
    post.mockRejectedValue(new Error('403'));
    await expect(confirmFreeEnrolment('intro')).rejects.toThrow('403');
  });
});
