/**
 * When the post-signup onboarding wizard may appear (GP-593).
 *
 * Free enrolment sends the learner straight to the course (`learn_url`), but
 * the (dashboard) layout opened the six-question wizard as a full-screen modal
 * on top of the lesson, with no way out except finishing it. Finishing then
 * pushed to /dashboard/student, so "Start learning free" put two screens
 * between the learner and the first lesson.
 *
 * Rules:
 *  - never over a learning page: the lesson opens first, and the wizard waits
 *    for the next ordinary dashboard page;
 *  - once skipped, not again in the same browser session.
 */

export const ONBOARDING_SKIP_KEY = 'carsi:onboarding-skipped';

const LEARNING_ROUTE = /^\/dashboard\/(?:learn\/[^/]+|courses\/[^/]+\/(?:lessons|quiz)\/[^/]+)(?:\/|$)/;

export function isLearningRoute(pathname: string | null | undefined): boolean {
  return typeof pathname === 'string' && LEARNING_ROUTE.test(pathname);
}

export function shouldShowOnboardingWizard(input: {
  onboardingCompleted: boolean;
  pathname: string | null | undefined;
  skippedThisSession: boolean;
}): boolean {
  if (input.onboardingCompleted) return false;
  if (input.skippedThisSession) return false;
  if (isLearningRoute(input.pathname)) return false;
  return true;
}

export function readSkipped(): boolean {
  try {
    return window.sessionStorage.getItem(ONBOARDING_SKIP_KEY) === '1';
  } catch {
    return false;
  }
}

export function rememberSkipped(): void {
  try {
    window.sessionStorage.setItem(ONBOARDING_SKIP_KEY, '1');
  } catch {
    // storage blocked (private mode etc.): the skip still applies until reload
  }
}
