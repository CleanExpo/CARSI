import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  LESSON_FOOTER_ACTIONS_CLASS,
  LESSON_FOOTER_ROW_CLASS,
  LessonFooterNav,
  type LessonFooterNavProps,
} from './LessonFooterNav';

/**
 * WS1 fix 5 (GP-544, directive break 7). Measured live on carsi.com.au on 2026-09-03: the
 * lesson footer pushed its completion actions to the right edge of the content column, where
 * Margot's fixed bottom-right launcher (214 by 66 on desktop, 121 by 66 on a phone) covered
 * "Mark lesson complete" at 1200, 820 and 390 widths, and the open chat panel covered it too.
 *
 * The fix is layout: every control stays at the left of the column and the row keeps bottom
 * clearance for the launcher. Tailwind classes are the layout, so these tests pin the class
 * attributes the browser receives, against the pre-fix classes as positive controls.
 *
 * Disabled state is asserted on the `disabled=""` ATTRIBUTE, never on the word "disabled":
 * the Button's class list carries `disabled:opacity-50`, so a looser match cannot fail.
 */

// The two class strings the learn shell carried at 5f287426 (the pushed-right layout).
const PRE_FIX_ROW_CLASS =
  'mt-8 flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between';
const PRE_FIX_ACTIONS_CLASS = 'flex flex-wrap items-center justify-end gap-2 sm:gap-3';

const PUSHED_RIGHT = /\bjustify-(between|end)\b|\bml-auto\b|\bsm:justify-(between|end)\b/;
const CLEARANCE = /\bpb-(2[4-9]|[3-9]\d)\b/; // at least 6rem

const noop = () => {};

function render(overrides: Partial<LessonFooterNavProps> = {}): string {
  return renderToStaticMarkup(
    <LessonFooterNav
      hasPrev
      hasNext
      onPrev={noop}
      onNext={noop}
      completed={false}
      saving={false}
      onComplete={noop}
      onShare={noop}
      error={null}
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

/** The opening tag of the button whose visible text starts with `label` (after any icon). */
function buttonTag(html: string, label: string): string {
  const re = new RegExp(`<button[^>]*>(?:<svg[\\s\\S]*?</svg>)?${label}`);
  const m = html.match(re);
  if (!m) throw new Error(`no button labelled ${label}`);
  return m[0].slice(0, m[0].indexOf('>') + 1);
}

function isDisabled(tag: string): boolean {
  return /\sdisabled=""/.test(tag);
}

function shownText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

describe('LessonFooterNav: nothing sits under the bottom-right launcher', () => {
  it('rejects the pre-fix layout (positive control)', () => {
    expect(PRE_FIX_ROW_CLASS).toMatch(PUSHED_RIGHT);
    expect(PRE_FIX_ACTIONS_CLASS).toMatch(PUSHED_RIGHT);
    expect(PRE_FIX_ROW_CLASS).not.toMatch(CLEARANCE);
    // The disabled probe reads the attribute, not the class list (positive control).
    expect(isDisabled('<button class="disabled:opacity-50" type="button">')).toBe(false);
    expect(isDisabled('<button class="x" disabled="" type="button">')).toBe(true);
  });

  it('the row and the actions are left-aligned, and the row clears the launcher', () => {
    const html = render();
    const row = classOf(html, 'lesson-footer');
    const actions = classOf(html, 'lesson-footer-actions');
    expect(row).toBe(LESSON_FOOTER_ROW_CLASS);
    expect(actions).toBe(LESSON_FOOTER_ACTIONS_CLASS);
    expect(row).not.toMatch(PUSHED_RIGHT);
    expect(actions).not.toMatch(PUSHED_RIGHT);
    expect(row).toMatch(/\bsm:justify-start\b/);
    expect(actions).toMatch(/\bjustify-start\b/);
    expect(row).toMatch(CLEARANCE);
  });

  it('renders Previous, Next and Mark lesson complete, in that order, before completion', () => {
    const html = render();
    const text = shownText(html);
    expect(text).toMatch(/Previous.*Next.*Mark lesson complete/);
    expect(text).not.toContain('Share progress');
    expect(text).not.toContain('Lesson completed');
    expect(isDisabled(buttonTag(html, 'Previous'))).toBe(false);
    expect(isDisabled(buttonTag(html, 'Next'))).toBe(false);
    expect(isDisabled(buttonTag(html, 'Mark lesson complete'))).toBe(false);
  });

  it('after completion shows Share progress and a disabled Lesson completed button', () => {
    const html = render({ completed: true });
    const text = shownText(html);
    expect(text).toMatch(/Share progress.*Lesson completed/);
    expect(text).not.toContain('Mark lesson complete');
    expect(isDisabled(buttonTag(html, 'Lesson completed'))).toBe(true);
    expect(isDisabled(buttonTag(html, 'Share progress'))).toBe(false);
  });

  it('disables Previous or Next when there is no lesson that way, and the action while saving', () => {
    const html = render({ hasPrev: false, hasNext: false, saving: true });
    expect(isDisabled(buttonTag(html, 'Previous'))).toBe(true);
    expect(isDisabled(buttonTag(html, 'Next'))).toBe(true);
    expect(isDisabled(buttonTag(html, 'Mark lesson complete'))).toBe(true);
  });

  it('shows the completion error left-aligned, as an alert, on its own line', () => {
    const html = render({ error: 'Could not save progress' });
    expect(html).toMatch(/<p[^>]*role="alert"[^>]*class="[^"]*\btext-left\b[^"]*"[^>]*>Could not save progress<\/p>/);
    expect(html).not.toMatch(/text-right/);
  });
});
