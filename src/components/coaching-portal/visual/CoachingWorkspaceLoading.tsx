import {
  coachingCard,
  coachingEyebrow,
  coachingMuted,
  coachingPage,
} from '@/components/coaching-portal/coaching-ui';

export function CoachingWorkspaceLoading() {
  return (
    <div
      className={coachingPage}
      data-testid="coaching-workspace-loading"
      aria-busy="true"
      aria-label="Loading workspace"
    >
      <p className={coachingEyebrow}>Business Coaching</p>
      <div className={`mt-6 ${coachingCard} space-y-4 motion-safe:animate-pulse`}>
        <div className="h-6 w-48 rounded bg-white/10" />
        <div className="h-4 w-full max-w-lg rounded bg-white/[0.06]" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-24 rounded-xl bg-white/[0.04]" />
          <div className="h-24 rounded-xl bg-white/[0.04]" />
        </div>
      </div>
      <p className={`mt-4 text-center text-xs ${coachingMuted}`}>Loading your workspace…</p>
    </div>
  );
}
