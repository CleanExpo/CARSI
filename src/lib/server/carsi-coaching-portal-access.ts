import type { SessionClaims } from '@/lib/auth/session-jwt';
import { isLmsClaimsAllowedAdminPanel } from '@/lib/admin/admin-panel-access';
import { carsiCoachingMonthlyPath } from '@/lib/marketing/carsi-coaching-monthly';
import { decideCoachingPortalEntitlement } from '@/lib/server/carsi-coaching-entitlement';
import {
  getCoachingPortalRowForUser,
  workspaceFromRow,
} from '@/lib/server/carsi-coaching-subscription-store';

export type CoachingPortalAccessMode = 'subscriber' | 'staff_preview' | 'locked';

export type CoachingPortalAccess = {
  mode: CoachingPortalAccessMode;
  entitled: boolean;
  canEdit: boolean;
  subscribeUrl: string;
  subscription: {
    status: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  workspace: ReturnType<typeof workspaceFromRow>;
};

export async function getCoachingPortalAccess(
  claims: SessionClaims,
): Promise<CoachingPortalAccess> {
  const row = await getCoachingPortalRowForUser(claims.sub);
  const entitlement = decideCoachingPortalEntitlement(
    row
      ? { status: row.status, currentPeriodEnd: row.currentPeriodEnd }
      : null,
  );

  const staffPreview = isLmsClaimsAllowedAdminPanel(claims);
  const entitled = entitlement.entitled;
  const mode: CoachingPortalAccessMode = entitled
    ? 'subscriber'
    : staffPreview
      ? 'staff_preview'
      : 'locked';

  return {
    mode,
    entitled,
    canEdit: entitled,
    subscribeUrl: carsiCoachingMonthlyPath,
    subscription: row
      ? {
          status: row.status,
          currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null,
          cancelAtPeriodEnd: row.cancelAtPeriodEnd,
        }
      : null,
    workspace: row
      ? workspaceFromRow(row)
      : {
          horizontalSummary: '',
          directionSummary: '',
          sessionPrepNotes: '',
          monthlyActions: [],
        },
  };
}
