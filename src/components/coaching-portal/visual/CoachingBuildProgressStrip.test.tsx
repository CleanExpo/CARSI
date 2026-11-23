// @vitest-environment jsdom

import { act, createElement, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CoachingBuildProgressStrip } from './CoachingBuildProgressStrip';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const STEPS = ['Reading your answers', 'Drafting the plan', 'Checking the plan'] as const;
const TEST_ID = 'coaching-build-progress';

let container: HTMLDivElement;
let root: Root | null = null;

function render(active: boolean) {
  act(() => {
    root!.render(
      createElement(
        StrictMode,
        null,
        createElement(CoachingBuildProgressStrip, { active, steps: STEPS, testId: TEST_ID })
      )
    );
  });
}

function shownStep(): string | null | undefined {
  return container.querySelector(`[data-testid="${TEST_ID}"] p`)?.textContent;
}

beforeEach(() => {
  vi.useFakeTimers();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('CoachingBuildProgressStrip', () => {
  it('starts a restarted build on the first step, even after a late tick', () => {
    // Keep every interval callback the strip registers, so one can fire after cleanup.
    const callbacks: Array<() => void> = [];
    const realSetInterval = window.setInterval.bind(window);
    vi.spyOn(window, 'setInterval').mockImplementation(((
      handler: TimerHandler,
      timeout?: number,
      ...args: unknown[]
    ) => {
      if (typeof handler === 'function') callbacks.push(handler as () => void);
      return realSetInterval(handler, timeout, ...args);
    }) as typeof window.setInterval);

    render(true);
    expect(shownStep()).toBe(STEPS[0]);

    act(() => {
      vi.advanceTimersByTime(2200);
    });
    expect(shownStep()).toBe(STEPS[1]);

    // Stop the build: the strip unmounts its content and clears the interval.
    render(false);
    expect(container.querySelector(`[data-testid="${TEST_ID}"]`)).toBeNull();

    // A tick that was already queued when the interval was cleared still runs.
    const late = callbacks.at(-1);
    expect(late).toBeDefined();
    act(() => {
      late!();
    });

    // Restart: the strip must show step one, not carry the late tick over.
    render(true);
    expect(shownStep()).toBe(STEPS[0]);
    expect(container.textContent).toContain(`Step 1 of ${STEPS.length}`);
  });
});
