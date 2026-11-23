// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminCoachingMemberWorkspaceClient } from './AdminCoachingMemberWorkspaceClient';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const MEMBER = '11111111-1111-4111-8111-111111111111';

function json(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as Response;
}

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('userId=')) {
        return json({
          workspace: {
            businessName: 'Acme Restore',
            chapterSlug: 'carsi-business-coaching',
            coachUserId: 'coach-phill-mcgurk',
            onboardingSubmittedAt: '2026-01-01T00:00:00.000Z',
            briefGeneratedAt: '2026-01-02T00:00:00.000Z',
            brief: {
              version: 1,
              generatedAt: '2026-01-02T00:00:00.000Z',
              source: 'fallback',
              model: null,
              memberName: 'Member A',
              businessName: 'Acme Restore',
              summary: 'Sample brief',
              suggestedFocusTitle: 'Follow up quotes',
              suggestedFocusDescription: 'Within 48 hours.',
              sections: [{ heading: 'Context', body: 'Owner-led.' }],
              draftActions: [{ title: 'Call quotes', rationale: 'Conversion.' }],
            },
            growthPlan: {
              status: 'approved',
              focusTitle: 'Quotes',
              focusDescription: '48h calls',
              approvedAt: '2026-01-03T00:00:00.000Z',
            },
            subscription: { status: 'active', startedAt: '2025-12-01T00:00:00.000Z' },
            hasOnboardingSnapshot: true,
          },
        });
      }
      return json({
        members: [
          {
            userId: MEMBER,
            email: 'a@example.test',
            fullName: 'Member A',
            subscriptionStatus: 'active',
            draftCount: 0,
          },
        ],
      });
    })
  );
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe('AdminCoachingMemberWorkspaceClient', () => {
  it('loads members and renders coach brief', async () => {
    await act(async () => root.render(<AdminCoachingMemberWorkspaceClient />));
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.textContent).toContain('Member workspace');
    expect(container.querySelector('[data-testid="admin-coach-brief"]')?.textContent).toContain(
      'Sample brief'
    );
  });
});
