import { carsiCoachingAddOnContactEmail } from '@/lib/marketing/carsi-coaching-program';

export const COACHING_SUPPORT_EMAIL = carsiCoachingAddOnContactEmail;

export function coachingSupportMailtoUrl(subject = 'Business Coaching support'): string {
  return `mailto:${COACHING_SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

/** Opens the default mail client (works more reliably than in-app navigation alone). */
export function openCoachingSupportEmail(subject = 'Business Coaching support'): void {
  if (typeof window === 'undefined') return;
  const url = coachingSupportMailtoUrl(subject);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
