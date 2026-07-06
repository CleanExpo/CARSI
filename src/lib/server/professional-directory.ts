/**
 * Professional Directory data layer (GitHub #298 / GP-449).
 *
 * Until NRPG registry integration lands (UNI-87 Track A), this module returns
 * no listings. Stub fixtures live in professional-directory.stub.ts for tests only.
 */

export type NrpgMembershipTier = 'associate' | 'member' | 'senior_member' | 'fellow';
export type NrpgMembershipStatus = 'active' | 'inactive' | 'suspended';

export type VerifiedProfessional = {
  id: string;
  name: string;
  businessName: string;
  certifications: string[];
  industries: string[];
  serviceAreas: string[];
  locationCity: string;
  locationState: string;
  membershipTier: NrpgMembershipTier;
  membershipStatus: NrpgMembershipStatus;
  /** ISO timestamp when NRPG last confirmed this profile; null until live sync exists. */
  syncedAt: string | null;
};

export type ProfessionalDirectoryStatus = {
  live: boolean;
  listingCount: number;
  source: 'none' | 'nrpg_registry';
};

export function isProfessionalDirectoryLive(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return env.PROFESSIONAL_DIRECTORY_LIVE?.trim() === 'true';
}

/**
 * Returns verified professionals for the public directory.
 * Default (and current production) behaviour: empty array — no fabricated NRPG rows.
 */
export async function getVerifiedProfessionals(
  env: NodeJS.ProcessEnv = process.env
): Promise<VerifiedProfessional[]> {
  if (!isProfessionalDirectoryLive(env)) {
    return [];
  }

  // UNI-87 Track A: query NRPG member registry / `professionals` table here.
  // Until then, never fall back to static stub data on a live flag.
  return [];
}

export async function getProfessionalDirectoryStatus(
  env: NodeJS.ProcessEnv = process.env
): Promise<ProfessionalDirectoryStatus> {
  const professionals = await getVerifiedProfessionals(env);
  return {
    live: isProfessionalDirectoryLive(env) && professionals.length > 0,
    listingCount: professionals.length,
    source: professionals.length > 0 ? 'nrpg_registry' : 'none',
  };
}
