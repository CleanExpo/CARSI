import { describe, expect, it } from 'vitest';

import { coachingHomeQuickLinks } from './coaching-home-quick-links';

describe('coachingHomeQuickLinks', () => {
  it('includes marketing when profile is ready', () => {
    const links = coachingHomeQuickLinks({ marketingReady: true, proposedFixCount: 2 });
    expect(links.some((l) => l.label === 'Marketing pack')).toBe(true);
    expect(links.find((l) => l.label === 'Actions')?.description).toMatch(/2 fixes/);
  });

  it('omits marketing when profile is not ready', () => {
    const links = coachingHomeQuickLinks({ marketingReady: false, proposedFixCount: 0 });
    expect(links.some((l) => l.label === 'Marketing pack')).toBe(false);
  });
});
