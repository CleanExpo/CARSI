// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { iicrcCodes } from '../../../scripts/lib/iicrc-codes-shim.mjs';

import { LinkedInShareButton } from './LinkedInShareButton';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * LinkedIn "Add to profile" puts what CARSI sends on the learner's public profile.
 *
 * The button used to name the certification `${courseTitle} (${iicrcDiscipline})`: an IICRC
 * acronym branding a CARSI certificate (banned by the designation rule), or "Title ()" when the
 * discipline is null, which it is for every designation-era course. It sent organizationName
 * instead of CARSI's Page id (urn:li:organization:65591140, read from linkedin.com/company/carsiaus
 * on 19/10/2026), so the certificate showed no CARSI logo or Page link. Its "AI Draft" button
 * posted to /api/lms/credentials/{id}/linkedin-draft, a route that only existed in the retired
 * Python backend.
 */
const COURSE_TITLE = 'Water Damage Restoration Fundamentals';
const IICRC_ACRONYM = new RegExp(`\\b(?:${iicrcCodes().join('|')})\\b`);

let container: HTMLDivElement;
let root: Root | null = null;
const open = vi.fn();
const fetchSpy = vi.fn();

function mount() {
  act(() => {
    root = createRoot(container);
    root.render(
      createElement(LinkedInShareButton, {
        courseTitle: COURSE_TITLE,
        issuedYear: 2026,
        issuedMonth: 10,
        credentialId: 'CARSI-2026-000123',
        credentialUrl: 'https://carsi.com.au/verify/credential/CARSI-2026-000123',
      })
    );
  });
}

function buttons(): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll('button'));
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  open.mockReset();
  fetchSpy.mockReset();
  vi.stubGlobal('open', open);
  vi.stubGlobal('fetch', fetchSpy);
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container.remove();
  vi.unstubAllGlobals();
});

describe('LinkedInShareButton', () => {
  it('adds the certification under the CARSI course title and CARSI Page id only', () => {
    mount();
    const add = buttons().find((b) => /add to linkedin/i.test(b.textContent ?? ''));
    expect(add).toBeDefined();
    act(() => add!.click());

    expect(open).toHaveBeenCalledTimes(1);
    const url = new URL(open.mock.calls[0][0] as string);
    expect(url.origin + url.pathname).toBe('https://www.linkedin.com/profile/add');
    const name = url.searchParams.get('name') ?? '';
    expect(name).toBe(COURSE_TITLE);
    expect(name).not.toMatch(/[()]/);
    expect(name).not.toMatch(IICRC_ACRONYM);
    expect(url.searchParams.get('organizationId')).toBe('65591140');
    expect(url.searchParams.has('organizationName')).toBe(false);
    expect(url.searchParams.get('certId')).toBe('CARSI-2026-000123');
  });

  it('offers no AI draft, because no draft route exists', () => {
    mount();
    expect(buttons()).toHaveLength(1);
    expect(container.textContent ?? '').not.toMatch(/draft/i);
    for (const b of buttons()) act(() => b.click());
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
