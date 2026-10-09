'use client';

import { createContext, useContext } from 'react';

import type { CoachingPortalDashboard } from '@/lib/server/carsi-coaching-portal-dashboard';

const CoachingPortalContext = createContext<CoachingPortalDashboard | null>(null);

export function CoachingPortalProvider({
  dashboard,
  children,
}: {
  dashboard: CoachingPortalDashboard;
  children: React.ReactNode;
}) {
  return (
    <CoachingPortalContext.Provider value={dashboard}>{children}</CoachingPortalContext.Provider>
  );
}

export function useCoachingPortal(): CoachingPortalDashboard {
  const ctx = useContext(CoachingPortalContext);
  if (!ctx) throw new Error('CoachingPortalProvider missing');
  return ctx;
}
