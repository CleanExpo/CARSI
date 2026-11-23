import { describe, expect, it } from 'vitest';

import {
  getInteractiveLearningOffer,
  getLiveInteractiveLearningOffers,
  interactiveLearningPath,
  listInteractiveLearningOffers,
} from '@/lib/lms/interactive-learning-catalog';

describe('interactive-learning-catalog', () => {
  it('lists live and coming-soon offers', () => {
    const offers = listInteractiveLearningOffers();
    expect(offers.length).toBeGreaterThan(1);
    expect(getLiveInteractiveLearningOffers().some((o) => o.experienceId === 'water-damage-module-3-pilot')).toBe(true);
  });

  it('enriches live offer with activity count and XP', () => {
    const offer = getInteractiveLearningOffer('water-damage-module-3-pilot');
    expect(offer?.activityCount).toBe(6);
    expect(offer?.xpTotal).toBe(100);
  });

  it('builds public paths', () => {
    expect(interactiveLearningPath('water-damage-module-3-pilot')).toBe(
      '/interactive-learning/water-damage-module-3-pilot'
    );
  });
});