// @vitest-environment jsdom

import { act, createElement, type CSSProperties, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// Plain elements instead of animations, so every step renders synchronously in jsdom.
vi.mock('framer-motion', () => {
  type MotionProps = { children?: ReactNode; className?: string; style?: CSSProperties };
  const plain = (tag: string) =>
    function Plain({ children, className, style }: MotionProps) {
      return createElement(tag, { className, style }, children);
    };
  return {
    motion: new Proxy({}, { get: (_target, tag) => plain(String(tag)) }),
    AnimatePresence: ({ children }: { children?: ReactNode }) => children,
    useReducedMotion: () => true,
  };
});

const apiMock = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ apiClient: apiMock }));

import { OnboardingWizard } from './OnboardingWizard';

/** What the onboarding API answers today: a catalogue URL filtered to the recommended discipline. */
const SUGGESTED_CATALOGUE_URL = '/dashboard/courses?discipline=water-damage-restoration';

let container: HTMLDivElement;
let root: Root | null = null;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  apiMock.post.mockReset();
  apiMock.post.mockResolvedValue({
    recommended_pathway: 'water-damage-restoration',
    pathway_label: 'Water damage restoration',
    pathway_description: 'Start with the water damage restoration area.',
    suggested_courses_url: SUGGESTED_CATALOGUE_URL,
  });
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  container.remove();
});

function buttons(): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll('button'));
}

function click(button: HTMLButtonElement) {
  act(() => {
    button.click();
  });
}

/** Walks the wizard: first answer on each single step, Continue on the multi step, Finish, then the result button. */
async function walkToCompletion(): Promise<HTMLButtonElement> {
  for (let i = 0; i < 12; i++) {
    const all = buttons();
    const done = all.find((b) => (b.textContent ?? '').includes('Go to your dashboard'));
    if (done) return done;
    const finish = all.find((b) => (b.textContent ?? '').trim() === 'Finish');
    if (finish) {
      click(finish);
      await act(async () => {
        await Promise.resolve();
      });
      continue;
    }
    const next = all.find((b) => (b.textContent ?? '').trim() === 'Continue');
    if (next) {
      click(next);
      continue;
    }
    const answer = all.find((b) => !b.disabled && !/back/i.test(b.textContent ?? ''));
    if (!answer) throw new Error(`no step control found among: ${all.map((b) => b.textContent).join(' | ')}`);
    click(answer);
  }
  throw new Error('the wizard never reached its result screen');
}

describe('OnboardingWizard completion', () => {
  it('lands on the learner home the button names, not on the discipline-filtered catalogue the API suggests', async () => {
    const onComplete = vi.fn();
    act(() => {
      root = createRoot(container);
      root.render(createElement(OnboardingWizard, { isOpen: true, onComplete }));
    });

    const done = await walkToCompletion();
    expect(apiMock.post).toHaveBeenCalledTimes(1);
    expect(apiMock.post.mock.calls[0][0]).toBe('/api/lms/auth/onboarding');
    expect(container.textContent).toContain('Water damage restoration');

    click(done);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('/dashboard/student');
    expect(onComplete).not.toHaveBeenCalledWith(SUGGESTED_CATALOGUE_URL);
  });

  it('positive control: the suggested URL the API returns is the catalogue, so the old behaviour would have landed there', () => {
    expect(SUGGESTED_CATALOGUE_URL.startsWith('/dashboard/courses?discipline=')).toBe(true);
    expect(SUGGESTED_CATALOGUE_URL).not.toBe('/dashboard/student');
  });
});
