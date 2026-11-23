/**
 * GP-706 item 1 — the admin contact reply tool checks every free-text field for
 * the shape of pasted standard text before anything is stored or sent.
 *
 * All text here is synthetic: invented sentences that carry the cite-density
 * signature (a standard named, clustered clause numbers, repeated "shall").
 * None of it is taken from any standard. Addresses use the reserved .test domain.
 */
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const SUBMISSION_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const DRAFT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const state = vi.hoisted(() => ({
  sends: [] as unknown[],
  creates: [] as unknown[],
  updates: [] as unknown[],
}));

vi.mock('@/lib/admin/admin-session', () => ({
  getAdminSessionOrNull: async () => ({ email: 'admin@example.test' }),
}));

vi.mock('@/lib/server/app-url', () => ({
  getAppOrigin: () => 'https://carsi.example.test',
}));

vi.mock('@/lib/server/transactional-email', () => ({
  sendContactReplyEmail: async (input: unknown) => {
    state.sends.push(input);
    return { sent: true };
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    contactSubmission: {
      findUnique: async () => ({
        id: SUBMISSION_ID,
        email: 'learner@example.test',
        firstName: 'Sam',
        lastName: 'Placeholder',
        message: 'A synthetic question about drying.',
        status: 'new',
      }),
      update: async () => ({}),
    },
    contactReplyDraft: {
      findUnique: async () => ({
        id: DRAFT_ID,
        submissionId: SUBMISSION_ID,
        recipientEmail: 'learner@example.test',
        replyBody: 'Hi Sam,\n\nA stored draft.',
        status: 'pending_approval',
      }),
      create: async (args: unknown) => {
        state.creates.push(args);
        return { id: DRAFT_ID };
      },
      update: async (args: unknown) => {
        state.updates.push(args);
        return {};
      },
    },
  },
}));

const { findStandardWordingInFreeText, buildContactReplyText, STANDARD_WORDING_REJECTION } =
  await import('@/lib/server/contact-reply');
const inlineRoute = await import('../../../app/api/admin/contacts/reply/route');
const draftsRoute = await import('../../../app/api/admin/contacts/reply-drafts/route');

const PAD =
  'Thanks for your question about the job. Here is how we would approach the drying plan ' +
  'on a site like the one you describe, in plain terms, before any equipment goes in. ';

/** Synthetic, invented text with the signature of pasted standard body text. */
const STANDARD_LIKE =
  PAD +
  'Under IICRC S500 the restorer shall set a drying goal at 7.4.1, shall log readings at ' +
  '7.4.2 and shall confirm the goal at 7.4.3 before the job is closed. ' +
  PAD;

/** A plain-English answer that names a standard nominatively. */
const CLEAN =
  PAD +
  'We would set a drying goal for each material, take readings every day and confirm the ' +
  'goal is met before removing equipment. Check your own licensed copy of IICRC S500 for detail. ' +
  PAD;

function post(url: string, body: unknown, method = 'POST'): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  process.env.DATABASE_URL = 'postgres://placeholder.test/db';
  state.sends.length = 0;
  state.creates.length = 0;
  state.updates.length = 0;
});

afterEach(() => {
  delete process.env.DATABASE_URL;
});

describe('findStandardWordingInFreeText', () => {
  it('flags text with the cite-density signature of a standard', () => {
    expect(findStandardWordingInFreeText(STANDARD_LIKE)).not.toBeNull();
  });

  it('passes a plain answer that names a standard nominatively', () => {
    expect(findStandardWordingInFreeText(CLEAN)).toBeNull();
  });

  it('ignores the generated citation line, so two cited sections are not a false positive', () => {
    const body = buildContactReplyText({
      recipientName: 'Sam',
      answerParagraphs: [CLEAN],
      sources: [
        { standard: 'IICRC S500', section: '12.2.3' },
        { standard: 'IICRC S520', section: '10.4.1' },
      ],
    });
    expect(findStandardWordingInFreeText(body)).toBeNull();
  });
});

describe('inline reply route: replyBody', () => {
  it('rejects standard-like text with 422 and sends and stores nothing', async () => {
    const res = await inlineRoute.POST(
      post('https://carsi.example.test/api/admin/contacts/reply', {
        submissionId: SUBMISSION_ID,
        replyBody: STANDARD_LIKE,
      }),
    );
    expect(res.status).toBe(422);
    expect((await res.json()).detail).toBe(STANDARD_WORDING_REJECTION);
    expect(state.sends).toHaveLength(0);
    expect(state.creates).toHaveLength(0);
  });

  it('still sends a clean reply', async () => {
    const res = await inlineRoute.POST(
      post('https://carsi.example.test/api/admin/contacts/reply', {
        submissionId: SUBMISSION_ID,
        replyBody: CLEAN,
      }),
    );
    expect(res.status).toBe(200);
    expect(state.sends).toHaveLength(1);
  });
});

describe('reply-drafts route: answerParagraphs (POST)', () => {
  it('rejects standard-like paragraphs with 422 and stores nothing', async () => {
    const res = await draftsRoute.POST(
      post('https://carsi.example.test/api/admin/contacts/reply-drafts', {
        submissionId: SUBMISSION_ID,
        answerParagraphs: [STANDARD_LIKE],
        sources: [{ standard: 'IICRC S500', section: '12.2.3' }],
      }),
    );
    expect(res.status).toBe(422);
    expect((await res.json()).detail).toBe(STANDARD_WORDING_REJECTION);
    expect(state.creates).toHaveLength(0);
  });

  it('still stores a clean draft citing two sections', async () => {
    const res = await draftsRoute.POST(
      post('https://carsi.example.test/api/admin/contacts/reply-drafts', {
        submissionId: SUBMISSION_ID,
        answerParagraphs: [CLEAN],
        sources: [
          { standard: 'IICRC S500', section: '12.2.3' },
          { standard: 'IICRC S520', section: '10.4.1' },
        ],
      }),
    );
    expect(res.status).toBe(200);
    expect(state.creates).toHaveLength(1);
  });
});

describe('reply-drafts route: approval edit (PATCH replyBody)', () => {
  it('rejects a standard-like edit with 422 and sends nothing', async () => {
    const res = await draftsRoute.PATCH(
      post(
        'https://carsi.example.test/api/admin/contacts/reply-drafts',
        { id: DRAFT_ID, action: 'send', replyBody: STANDARD_LIKE },
        'PATCH',
      ),
    );
    expect(res.status).toBe(422);
    expect((await res.json()).detail).toBe(STANDARD_WORDING_REJECTION);
    expect(state.sends).toHaveLength(0);
    expect(state.updates).toHaveLength(0);
  });

  it('still sends a clean edit', async () => {
    const res = await draftsRoute.PATCH(
      post(
        'https://carsi.example.test/api/admin/contacts/reply-drafts',
        { id: DRAFT_ID, action: 'send', replyBody: CLEAN },
        'PATCH',
      ),
    );
    expect(res.status).toBe(200);
    expect(state.sends).toHaveLength(1);
  });
});
