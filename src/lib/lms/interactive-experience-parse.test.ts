import { describe, expect, it } from 'vitest';

import { parseInteractiveLessonResource } from '@/lib/lms/interactive-experience-parse';
import { parseLessonResources } from '@/lib/lms/lesson-resources';

describe('parseInteractiveLessonResource', () => {
  it('resolves registry id to full experience', () => {
    const parsed = parseInteractiveLessonResource({
      kind: 'interactive',
      experienceId: 'water-damage-module-3-pilot',
    });
    expect(parsed?.experience.activities.length).toBe(6);
  });

  it('integrates with parseLessonResources', () => {
    const resources = parseLessonResources([
      {
        kind: 'interactive',
        label: 'Pilot',
        experienceId: 'water-damage-module-3-pilot',
      },
    ]);
    expect(resources[0]).toMatchObject({ kind: 'interactive', label: 'Pilot' });
  });
});