import { describe, expect, it } from 'vitest';

import { PROFESSIONAL_DIRECTORY_STUB } from './professional-directory.stub';
import {
  getProfessionalDirectoryStatus,
  getVerifiedProfessionals,
  isProfessionalDirectoryLive,
} from './professional-directory';

describe('professional-directory', () => {
  it('is not live without PROFESSIONAL_DIRECTORY_LIVE=true', () => {
    expect(isProfessionalDirectoryLive({})).toBe(false);
    expect(isProfessionalDirectoryLive({ PROFESSIONAL_DIRECTORY_LIVE: 'false' })).toBe(false);
  });

  it('returns no listings when directory is not live', async () => {
    const listings = await getVerifiedProfessionals({});
    expect(listings).toEqual([]);
  });

  it('returns no listings even when live flag is set until NRPG sync ships', async () => {
    const listings = await getVerifiedProfessionals({ PROFESSIONAL_DIRECTORY_LIVE: 'true' });
    expect(listings).toEqual([]);
  });

  it('reports honest status when gated', async () => {
    await expect(getProfessionalDirectoryStatus({})).resolves.toEqual({
      live: false,
      listingCount: 0,
      source: 'none',
    });
  });

  it('keeps stub fixtures out of the runtime module', () => {
    expect(PROFESSIONAL_DIRECTORY_STUB[0]?.name).toBeTruthy();
    expect(PROFESSIONAL_DIRECTORY_STUB.some((p) => 'nrpg_member_id' in p)).toBe(false);
  });
});
