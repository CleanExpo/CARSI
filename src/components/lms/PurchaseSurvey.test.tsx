// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PurchaseSurvey } from './PurchaseSurvey';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement;
let root: Root | null = null;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  fetchMock = vi.fn(async () => new Response(JSON.stringify({ saved: true }), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container.remove();
  vi.unstubAllGlobals();
});

function render(sessionId: string | null) {
  act(() => {
    root = createRoot(container);
    root.render(createElement(PurchaseSurvey, { sessionId }));
  });
}

function button(text: string): HTMLButtonElement {
  const b = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
    (el) => el.textContent?.trim() === text
  );
  if (!b) throw new Error(`no button "${text}"`);
  return b;
}

async function settle() {
  for (let i = 0; i < 4; i += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

describe('PurchaseSurvey', () => {
  it('renders nothing without a session id', () => {
    render(null);
    expect(container.innerHTML).toBe('');
  });

  it('shows both questions, the purpose line, Skip, and every choice as a real button', () => {
    render('cs_test_1');
    const text = container.textContent ?? '';
    expect(text).toContain('What work do you do?');
    expect(text).toContain('How did you find us?');
    expect(text).toContain(
      'Optional. We use your answers to decide which courses to build. We keep them with your order and never show them next to your name.'
    );
    expect(button('Skip').type).toBe('button');
    expect(button('Commercial cleaning').getAttribute('aria-pressed')).toBe('false');
    expect(container.querySelectorAll('button[type="submit"]')).toHaveLength(0);
  });

  it('marks the tapped choice and sends nothing until asked', () => {
    render('cs_test_1');
    act(() => button('Commercial cleaning').click());
    expect(button('Commercial cleaning').getAttribute('aria-pressed')).toBe('true');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('has no free-text box, even after choosing Other', () => {
    render('cs_test_1');
    act(() => button('Other').click());
    expect(button('Other').getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelectorAll('input, textarea')).toHaveLength(0);
  });

  it('sends the chosen values and thanks the buyer', async () => {
    render('cs_test_1');
    act(() => button('Builder or construction trade').click());
    act(() => button('An AI assistant (ChatGPT, Claude and similar)').click());
    act(() => button('Send answers').click());
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/lms/checkout/survey');
    expect(JSON.parse(String(init.body))).toEqual({
      session_id: 'cs_test_1',
      industry: 'builder_trade',
      found_via: 'ai_assistant',
    });
    expect(container.textContent).toContain('Thank you');
  });

  it('T1b-6: a failed save shows a soft note and never throws', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    render('cs_test_1');
    act(() => button('Commercial cleaning').click());
    act(() => button('Send answers').click());
    await settle();
    expect(container.textContent).toContain('We could not save your answers');
  });

  it('Skip hides the survey without sending anything', () => {
    render('cs_test_1');
    act(() => button('Skip').click());
    expect(container.textContent).not.toContain('What work do you do?');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
