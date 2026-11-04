export type CoachingActionStatus = 'todo' | 'in_progress' | 'done' | 'blocked';

export type CoachingMonthlyAction = {
  id: string;
  title: string;
  status: CoachingActionStatus;
};

export type CoachingPortalWorkspace = {
  horizontalSummary: string;
  directionSummary: string;
  sessionPrepNotes: string;
  monthlyActions: CoachingMonthlyAction[];
};

export const EMPTY_COACHING_PORTAL_WORKSPACE: CoachingPortalWorkspace = {
  horizontalSummary: '',
  directionSummary: '',
  sessionPrepNotes: '',
  monthlyActions: [],
};

/** Feature switches the server resolves for the coaching workspace. */
export type CoachingPortalFeatures = {
  /** GP-635 check-ins and progress (CARSI_COACHING_ACCOUNTABILITY_ENABLED). */
  accountability: boolean;
};
