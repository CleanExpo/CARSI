import { readFileSync } from 'node:fs';

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
 * "Mark lesson complete" at 1200, 820 and 390 widths, and the open 420 by 560 panel (full
 * width on a phone) covered it too.
 *
 * Two layers of fix, both pinned here. Closed chat: every control stays at the left of the
 * column and the row keeps 6rem of bottom clearance for the launcher. Open chat: FloatingChat
 * mirrors its state as `data-margot-open` on <html>, and a rule in app/globals.css gives the
 * row (hook class `lesson-footer-nav`) 40rem of bottom clearance so the page can scroll the
 * controls above the panel. Tailwind classes and that rule ARE the layout, so these tests pin
 * the class attribute the browser receives and the rule the stylesheet ships, against the
 * pre-fix classes as positive controls.
 *
 * Disabled state is asserted on the `disabled=""` ATTRIBUTE, never on the word "disabled":
 * the Button's class list carries `disabled:opacity-50`, so a looser match cannot fail.
 */

// The two class strings the learn shell carried at 5f287426 (the pushed-right layout).
const PRE_FIX_ROW_CLASS =
  'mt-8 flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between';
const PRE_FIX_ACTIONS_CLASS = 'flex flex-wrap items-center justify-end gap-2 sm:gap-3';

const PUSHED_RIGHT = /\bjustify-(between|end)\b|\bml-auto\b|\bsm:justify-(between|end)\b/;
const CLOSED_CLEARANCE = /\bpb-(2[4-9]|[3-9]\d)\b/; // at least 6rem for the 66px launcher
const OPEN_HOOK = 'lesson-footer-nav';
// The open panel is 560px tall inside a 606px container; 38rem (608px) is the floor.
const OPEN_CLEARANCE_MIN_REM = 38;

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

/** The open-panel rule as shipped: `html[data-margot-open] .lesson-footer-nav { padding-bottom: <n>rem }`. */
function openPanelClearanceRem(css: string): number | null {
  const m = css.match(/html\[data-margot-open\]\s+\.lesson-footer-nav\s*\{[^}]*padding-bottom:\s*([\d.]+)rem/);
  return m ? Number(m[1]) : null;
}

describe('LessonFooterNav: nothing sits under the bottom-right launcher or the open panel', () => {
  it('rejects the pre-fix layout (positive control)', () => {
    expect(PRE_FIX_ROW_CLASS).toMatch(PUSHED_RIGHT);
    expect(PRE_FIX_ACTIONS_CLASS).toMatch(PUSHED_RIGHT);
    expect(PRE_FIX_ROW_CLASS).not.toMatch(CLOSED_CLEARANCE);
    expect(PRE_FIX_ROW_CLASS.split(' ')).not.toContain(OPEN_HOOK);
    // The disabled probe reads the attribute, not the class list (positive control).
    expect(isDisabled('<button class="disabled:opacity-50" type="button">')).toBe(false);
    expect(isDisabled('<button class="x" disabled="" type="button">')).toBe(true);
    // The stylesheet probe reads a real rule and rejects a missing or short one.
    expect(openPanelClearanceRem('html[data-margot-open] .lesson-footer-nav { padding-bottom: 40rem; }')).toBe(40);
    expect(openPanelClearanceRem('.lesson-footer-nav { padding-bottom: 40rem; }')).toBeNull();
  });

  it('the row and the actions are left-aligned, and the row clears the closed launcher', () => {
    const html = render();
    const row = classOf(html, 'lesson-footer');
    const actions = classOf(html, 'lesson-footer-actions');
    expect(row).toBe(LESSON_FOOTER_ROW_CLASS);
    expect(actions).toBe(LESSON_FOOTER_ACTIONS_CLASS);
    expect(row).not.toMatch(PUSHED_RIGHT);
    expect(actions).not.toMatch(PUSHED_RIGHT);
    expect(row).toMatch(/\bsm:justify-start\b/);
    expect(actions).toMatch(/\bjustify-start\b/);
    expect(row).toMatch(CLOSED_CLEARANCE);
  });

  it('the row carries the open-panel hook and the stylesheet gives it room to scroll above the panel', () => {
    const row = classOf(render(), 'lesson-footer');
    expect(row.split(' ')).toContain(OPEN_HOOK);
    const css = readFileSync(new URL('../../../app/globals.css', import.meta.url), 'utf8');
    const rem = openPanelClearanceRem(css);
    expect(rem).not.toBeNull();
    expect(rem as number).toBeGreaterThanOrEqual(OPEN_CLEARANCE_MIN_REM);
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
