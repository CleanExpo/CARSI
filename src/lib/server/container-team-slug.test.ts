import { describe, expect, it } from 'vitest';

import { containerTeamSlug } from './teams';

describe('containerTeamSlug', () => {
  it('is stable for the same owner and tier', () => {
    // Stability IS the mechanism: two concurrent checkouts compute the same slug,
    // so `LmsTeam.slug @unique` rejects the second create instead of letting a
    // duplicate container team through to be billed separately.
    const a = containerTeamSlug('teams_subscription', 'user-1');
    const b = containerTeamSlug('teams_subscription', 'user-1');

    expect(a).toBe(b);
  });

  it('differs between owners', () => {
    expect(containerTeamSlug('teams_subscription', 'user-1')).not.toBe(
      containerTeamSlug('teams_subscription', 'user-2'),
    );
  });

  it('differs between the teams and org products for one owner', () => {
    // An owner may hold a teams container and an org container; they must not
    // collide with each other.
    expect(containerTeamSlug('teams_subscription', 'user-1')).not.toBe(
      containerTeamSlug('org_subscription', 'user-1'),
    );
  });

  it('never leaks the owner id into the slug', () => {
    // Slugs appear in URLs, so the owner id is hashed rather than embedded.
    const userId = '3f6b1c2e-0000-4a1b-9d2e-abcdef123456';

    expect(containerTeamSlug('org_subscription', userId)).not.toContain(userId);
  });

  it('is URL-safe and prefixed by product', () => {
    expect(containerTeamSlug('teams_subscription', 'user-1')).toMatch(/^team-[0-9a-f]{16}$/);
    expect(containerTeamSlug('org_subscription', 'user-1')).toMatch(/^org-[0-9a-f]{16}$/);
  });
});
