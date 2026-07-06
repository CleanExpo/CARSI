import type { VerifiedProfessional } from './professional-directory';

/**
 * Dev/test fixture only — never returned by getVerifiedProfessionals() in production.
 * Used to exercise listing UI in tests without implying live NRPG data.
 */
export const PROFESSIONAL_DIRECTORY_STUB: VerifiedProfessional[] = [
  {
    id: 'fixture-001',
    name: 'Sarah Mitchell',
    businessName: 'Mitchell Water Restoration',
    certifications: ['IICRC WRT', 'IICRC ASD', 'IICRC FSRT'],
    industries: ['Water Damage', 'Structural Drying', 'Fire & Smoke'],
    serviceAreas: ['Brisbane', 'Ipswich', 'Logan'],
    locationCity: 'Brisbane',
    locationState: 'QLD',
    membershipTier: 'senior_member',
    membershipStatus: 'active',
    syncedAt: null,
  },
];
