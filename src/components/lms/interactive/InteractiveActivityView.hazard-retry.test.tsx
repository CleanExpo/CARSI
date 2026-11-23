// @vitest-environment jsdom
/**
 * Force-push review P2: after four wrong answers the hazard-spot activity hid "Try again" and
 * offered nothing else, so the learner could not finish the activity or the experience. A wrong
 * answer must always leave a way to try again.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InteractiveActivityView } from '@/components/lms/interactive/InteractiveActivityView';
import { WATER_DAMAGE_INTERACTIVE_PILOT } from '@/lib/lms/interactive-experience-data';
import type { HazardSpotActivity } from '@/lib/lms/interactive-experience-types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const hazard = WATER_DAMAGE_INTERACTIVE_PILOT.activities.find(
  (a): a is HazardSpotActivity => a.type === 'hazard-spot'
)!;

let container: HTMLDivElement;
let root: Root;

const buttons = () => [...container.querySelectorAll('button')];
const byText = (text: string) => buttons().find((b) => b.textContent?.trim().startsWith(text));
const click = (el: HTMLElement | undefined) => {
  if (!el) throw new Error('button not found');
  act(() => el.click());
};

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('hazard-spot retry', () => {
  it('fixture: the pilot has a hazard-spot activity with a wrong option', () => {
    expect(hazard).toBeDefined();
    expect(hazard.correctIds).not.toContain('noise');
  });

  it('still offers "Try again" after the fifth wrong answer, and a right answer then completes', () => {
    const onComplete = vi.fn();
    act(() => root.render(<InteractiveActivityView activity={hazard} onComplete={onComplete} />));
    const noise = hazard.options.find((o) => o.id === 'noise')!.label;

    for (let attempt = 1; attempt <= 6; attempt++) {
      click(byText(noise));
      click(byText('Check hazards'));
      expect(byText('Try again'), `attempt ${attempt}`).toBeDefined();
      click(byText('Try again'));
    }
    expect(onComplete).not.toHaveBeenCalled();

    for (const id of hazard.correctIds) click(byText(hazard.options.find((o) => o.id === id)!.label));
    click(byText('Check hazards'));
    expect(onComplete).toHaveBeenCalledWith(hazard.xp);
  });
});
