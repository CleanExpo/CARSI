import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { actionSecretConfigured, signAction, verifyAction } from './action-token';
import { executeToolCall, getFrontDeskTools, getWriteTool } from './registry';
import { captureEnquiryTool, validateEnquiry } from './tools/capture-enquiry';

const SECRET = 'test-secret-at-least-16-chars-long';
const T0 = 1_000_000_000_000;
const TTL_MS = 10 * 60 * 1000;

describe('action-token (confirm-gate integrity)', () => {
  const original = process.env.MARGOT_ACTION_SECRET;
  beforeEach(() => {
    process.env.MARGOT_ACTION_SECRET = SECRET;
  });
  afterEach(() => {
    if (original === undefined) delete process.env.MARGOT_ACTION_SECRET;
    else process.env.MARGOT_ACTION_SECRET = original;
  });

  it('round-trips a valid, unexpired token', () => {
    const { token } = signAction({ tool: 'capture_enquiry', data: { email: 'a@b.co' } }, T0);
    const v = verifyAction(token, T0 + 1000);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.payload).toEqual({ tool: 'capture_enquiry', data: { email: 'a@b.co' } });
  });

  it('rejects an expired token', () => {
    const { token } = signAction({ tool: 'x', data: {} }, T0);
    const v = verifyAction(token, T0 + TTL_MS + 1);
    expect(v).toEqual({ ok: false, reason: 'expired' });
  });

  it('rejects a tampered token (bad signature)', () => {
    const { token } = signAction({ tool: 'x', data: { amount: 1 } }, T0);
    const [body, mac] = token.split('.');
    const forged = `${body}X.${mac}`; // mutate the payload, keep the old MAC
    expect(verifyAction(forged, T0 + 1000)).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('rejects a malformed token', () => {
    expect(verifyAction('not-a-token', T0).ok).toBe(false);
    expect(verifyAction('', T0).ok).toBe(false);
  });

  it('fails closed when no secret is configured', () => {
    delete process.env.MARGOT_ACTION_SECRET;
    expect(actionSecretConfigured()).toBe(false);
    const v = verifyAction('anything', T0);
    expect(v).toEqual({ ok: false, reason: 'secret_unconfigured' });
  });
});

describe('capture_enquiry write tool', () => {
  it('validates required fields', () => {
    expect(validateEnquiry({ name: 'Jo', email: 'jo@x.co', message: 'need help' })).toMatchObject({
      name: 'Jo',
      email: 'jo@x.co',
    });
    expect(validateEnquiry({ name: 'J', email: 'jo@x.co', message: 'hi' })).toHaveProperty('error');
    expect(validateEnquiry({ name: 'Jo', email: 'not-an-email', message: 'hi there' })).toHaveProperty('error');
    expect(validateEnquiry({ name: 'Jo', email: 'jo@x.co', message: '' })).toHaveProperty('error');
  });

  it('is a confirm-gated write tool', () => {
    expect(captureEnquiryTool.readOnly).toBe(false);
    expect(captureEnquiryTool.requiresConfirmation).toBe(true);
    expect(getWriteTool('capture_enquiry')).toBeDefined();
  });

  it('propose returns a verifiable token and performs no write', async () => {
    process.env.MARGOT_ACTION_SECRET = SECRET;
    const proposal = await captureEnquiryTool.propose({
      name: 'Dana Lee',
      email: 'Dana@Example.com',
      message: 'Please call me about water damage training.',
    });
    expect(proposal.tool).toBe('capture_enquiry');
    expect(proposal.summary).toContain('Dana Lee');
    const v = verifyAction(proposal.token);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.payload.data).toMatchObject({ email: 'dana@example.com' });
    delete process.env.MARGOT_ACTION_SECRET;
  });

  it('propose throws on invalid input (model cannot force a bad proposal)', async () => {
    process.env.MARGOT_ACTION_SECRET = SECRET;
    await expect(captureEnquiryTool.propose({ name: 'x', email: 'bad', message: '' })).rejects.toThrow();
    delete process.env.MARGOT_ACTION_SECRET;
  });

  it('executeToolCall surfaces a proposal out-of-band and tells the model to await confirmation', async () => {
    process.env.MARGOT_ACTION_SECRET = SECRET;
    const tools = getFrontDeskTools({ includeWrite: true });
    const out = await executeToolCall(
      {
        id: 'c1',
        type: 'function',
        function: {
          name: 'capture_enquiry',
          arguments: JSON.stringify({ name: 'Sam Park', email: 'sam@x.co', message: 'quote please' }),
        },
      },
      tools
    );
    expect(out.proposal).toBeDefined();
    expect(out.proposal?.token).toBeTruthy();
    const forModel = JSON.parse(out.forModel);
    expect(forModel.awaiting_user_confirmation).toBe(true);
    // The model must NOT receive the raw token.
    expect(out.forModel).not.toContain(out.proposal?.token ?? '__no__');
    delete process.env.MARGOT_ACTION_SECRET;
  });
});

describe('capture_enquiry commit is the sole write site', () => {
  it('mutations live only under commit (propose/validate do not write)', () => {
    const src = readFileSync(join(__dirname, 'tools', 'capture-enquiry.ts'), 'utf8');
    const commitIdx = src.indexOf('async commit(');
    const beforeCommit = src.slice(0, commitIdx);
    // No prisma write before the commit method (i.e. not in propose/validate).
    for (const write of ['.create(', '.update(', '.delete(', '.upsert(']) {
      expect(beforeCommit).not.toContain(write);
    }
    // commit does write.
    expect(src.slice(commitIdx)).toContain('.create(');
  });
});
