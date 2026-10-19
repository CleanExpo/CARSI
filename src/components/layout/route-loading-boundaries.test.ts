import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const APP = join(process.cwd(), 'app');

describe('route loading boundaries', () => {
  // A root loading.tsx wraps every page, the public homepage included, in a Suspense boundary.
  // The hero then streamed into a hidden segment revealed only after the JS bundle ran.
  it('has no loading boundary at the app root or on the public groups', () => {
    for (const path of ['loading.tsx', '(public)/loading.tsx', '(auth)/loading.tsx']) {
      expect(existsSync(join(APP, path)), path).toBe(false);
    }
  });

  it('keeps the skeleton on each logged-in group', () => {
    for (const group of ['(admin)', '(dashboard)', '(coaching-portal)']) {
      expect(readFileSync(join(APP, group, 'loading.tsx'), 'utf8')).toContain(
        'RouteLoadingSkeleton'
      );
    }
  });
});
