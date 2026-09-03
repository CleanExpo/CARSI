import { createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { EnterpriseLessonFooter } from './EnterpriseLessonFooter';

/**
 * WS1 fix 5 (GP-544, directive break 7): the enterprise onboarding lesson footer is the second
 * of the three completion surfaces on the lesson page (with LessonFooterNav and the quiz-result
 * containers). It must carry the same two layers of clearance from Margot's fixed bottom-right
 * widget: `pb-24` for the closed launcher and the `lesson-footer-nav` hook for the open-panel
 * rule in app/globals.css, with its actions left-aligned rather than pushed to the corner.
 */

const PUSHED_RIGHT = /\bjustify-(between|end)\b|\bml-auto\b|\bsm:justify-(between|end)\b/;
const CLOSED_CLEARANCE = /\bpb-(2[4-9]|[3-9]\d)\b/;
const OPEN_HOOK = 'lesson-footer-nav';

// The completion row's classes at 5f287426 (pushed right) as positive controls.
const PRE_FIX_ROW = 'flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6';
const PRE_FIX_ACTIONS = 'flex flex-wrap items-center gap-2 sm:justify-end';

const noop = () => {};

function render(overrides: Partial<Parameters<typeof EnterpriseLessonFooter>[0]> = {}): string {
  return renderToStaticMarkup(
    <EnterpriseLessonFooter
      noteText=""
      onNoteChange={noop}
      noteEditorRef={createRef<HTMLTextAreaElement | null>()}
      onFormat={noop}
      onSaveNote={noop}
      onDeleteNote={noop}
      loadingNote={false}
      savingNote={false}
      deletingNote={false}
      noteStatus={null}
      onPrevious={noop}
      onNext={noop}
      hasPrevious
      hasNext
      onShare={noop}
      showShare={false}
      onComplete={noop}
      savingComplete={false}
      completed={false}
      {...overrides}
    />,
  );
}

function classOf(html: string, testId: string): string {
  const m =
    html.match(new RegExp(`class="([^"]*)"[^>]*data-testid="${testId}"`)) ??
    html.match(new RegExp(`data-testid="${testId}"[^>]*class="([^"]*)"`));
  if (!m) throw new Error(`no element with data-testid=${testId}`);
  return m[1];
}

/** The class of the element that directly contains the actions row (the completion panel). */
function completionRowClass(html: string): string {
  const idx = html.indexOf('data-testid="enterprise-lesson-actions"');
  if (idx < 0) throw new Error('no actions row');
  const before = html.slice(0, idx);
  const tags = before.match(/<div[^>]*class="[^"]*"[^>]*>/g) ?? [];
  // The panel is the nearest preceding div that carries the flex row classes.
  const panel = [...tags].reverse().find((t) => /sm:flex-row/.test(t));
  if (!panel) throw new Error('no completion panel');
  return panel.match(/class="([^"]*)"/)?.[1] ?? '';
}

function shownText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

describe('EnterpriseLessonFooter: clear of the bottom-right launcher and the open panel', () => {
  it('rejects the pre-fix completion row (positive control)', () => {
    expect(PRE_FIX_ROW).toMatch(PUSHED_RIGHT);
    expect(PRE_FIX_ACTIONS).toMatch(PUSHED_RIGHT);
  });

  it('the root carries the open-panel hook and the closed-launcher clearance', () => {
    const root = classOf(render(), 'enterprise-lesson-footer');
    expect(root.split(' ')).toContain(OPEN_HOOK);
    expect(root).toMatch(CLOSED_CLEARANCE);
  });

  it('the completion row and its actions are left-aligned', () => {
    const html = render();
    const row = completionRowClass(html);
    const actions = classOf(html, 'enterprise-lesson-actions');
    expect(row).not.toMatch(PUSHED_RIGHT);
    expect(row).toMatch(/\bsm:justify-start\b/);
    expect(actions).not.toMatch(PUSHED_RIGHT);
    expect(actions).toMatch(/\bjustify-start\b/);
  });

  it('still renders Previous, Next and Mark lesson complete, and Share when asked', () => {
    expect(shownText(render())).toMatch(/Previous.*Next.*Mark lesson complete/);
    expect(shownText(render({ showShare: true, completed: true }))).toMatch(/Share.*Lesson complete/);
  });
});
