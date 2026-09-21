export type CourseDetailPrimary = 'enrol' | 'start' | 'continue' | 'view';

export function courseDetailPrimaryAction(input: {
  enrolled: boolean;
  percent: number;
  completed: boolean;
}): CourseDetailPrimary {
  if (!input.enrolled) return 'enrol';
  if (input.completed) return 'view';
  if (input.percent <= 0) return 'start';
  return 'continue';
}

export function catalogueCourseCta(enrolled: boolean): 'Continue' | 'View course' {
  return enrolled ? 'Continue' : 'View course';
}

export function formatLearnerActivity(iso: string | null | undefined, now = Date.now()): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  const days = Math.floor((now - then) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
