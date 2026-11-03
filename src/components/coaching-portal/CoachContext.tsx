'use client';

import { createContext, useContext } from 'react';

import { carsiCoachingMonthlyPriceLabel } from '@/lib/marketing/carsi-coaching-monthly';

/**
 * The signed-in member's coach, for member-facing portal copy (GP-632). The portal layout
 * resolves it once on the server. Outside a provider it is the default chapter, so copy is
 * unchanged for Phill's members.
 */
export type PortalCoach = {
  /** Name used in copy: the partner coach's display name, else "Phill". */
  name: string;
  /** The member's monthly price, or null when the chapter has no price set. */
  priceLabel: string | null;
};

export const DEFAULT_PORTAL_COACH: PortalCoach = {
  name: 'Phill',
  priceLabel: carsiCoachingMonthlyPriceLabel,
};

const CoachContext = createContext<PortalCoach>(DEFAULT_PORTAL_COACH);

export function CoachProvider({
  coach,
  children,
}: {
  coach: PortalCoach;
  children: React.ReactNode;
}) {
  return <CoachContext.Provider value={coach}>{children}</CoachContext.Provider>;
}

export function useCoach(): PortalCoach {
  return useContext(CoachContext);
}
