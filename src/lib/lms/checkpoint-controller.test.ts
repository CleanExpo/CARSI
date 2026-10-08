import { describe, expect, it, vi } from 'vitest';
import { CheckpointController, CheckpointRequestError, singleLearnerRequest, type CheckpointTransport } from './checkpoint-controller';
import type { CheckpointResponse, CheckpointInput } from './lesson-checkpoint';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LearnerQuizResult, QuizPlayer } from '@/components/lms/QuizPlayer';

const version = 'a'.repeat(64);
function response(input?: CheckpointInput): CheckpointResponse {
  return { contentVersion: version, revision: input ? input.expectedRevision + 1 : 0, stale: false,
    checkpoint: input ? { version: 1, revision: input.expectedRevision + 1, contentVersion: version,
      answers: input.answers, position: input.position } : null, passedAttempt: null,
    content: { lesson: { id: 'lesson', title: 'Lesson', content_type: 'quiz', content_body: null,
      drive_file_id: null, duration_minutes: null, is_preview: false, order_index: 0, course_id: 'course' },
      course: { id: 'course', slug: 'course', title: 'Course' }, resources: [], quiz: null } };
}
const draft = (value: number) => ({ position: { kind: 'quiz' as const, value }, answers: { q: value } });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((r) => { resolve = r; }); return { promise, resolve }; }

describe('learner checkpoint controller', () => {
  it('is loading until hydration and does not report an unsaved edit saved', async () => {
    const transport = vi.fn<CheckpointTransport>().mockResolvedValue(response());
    const controller = new CheckpointController(transport, 'quiz');
    expect(controller.getSnapshot().status).toBe('loading');
    await controller.load(); controller.update(draft(1));
    expect(controller.getSnapshot()).toMatchObject({ status: 'pending', dirty: true }); controller.dispose();
  });
  it('serializes writes and saves newer edits with the acknowledged revision', async () => {
    const ack = deferred<CheckpointResponse>();
    const writes: CheckpointInput[] = [];
    const controller = new CheckpointController(async (method, input) => {
      if (method === 'GET') return response();
      writes.push(input!); return writes.length === 1 ? ack.promise : response(input);
    }, 'quiz');
    await controller.load(); controller.update(draft(1));
    const first = controller.flush(); const overlapping = controller.flush();
    controller.update(draft(2)); expect(writes).toHaveLength(1);
    ack.resolve(response(writes[0])); expect(await first).toBe(true); expect(await overlapping).toBe(true);
    expect(writes).toHaveLength(2); expect(writes[1].expectedRevision).toBe(1);
    expect(controller.getSnapshot()).toMatchObject({ status: 'saved', dirty: false, draft: draft(2) }); controller.dispose();
  });
  it('reconciles an exact lost acknowledgement by GET without another PATCH', async () => {
    let stored = response(); const methods: string[] = [];
    const controller = new CheckpointController(async (method, input) => {
      methods.push(method); if (method === 'GET') return stored;
      stored = response(input); throw new TypeError('Network lost');
    }, 'quiz');
    await controller.load(); controller.update(draft(1)); expect(await controller.flush()).toBe(true);
    expect(methods).toEqual(['GET', 'PATCH', 'GET']); expect(controller.getSnapshot().status).toBe('saved'); controller.dispose();
  });
  it.each(['answers', 'position', 'contentVersion', 'revision', 'checkpointVersion', 'checkpointRevision'])('rejects lost acknowledgement with different %s', async (field) => {
    let reads = 0;
    const controller = new CheckpointController(async (method) => {
      if (method === 'PATCH') throw new TypeError();
      if (++reads === 1) return response();
      const stored = response({ ...draft(1), contentVersion: version, expectedRevision: 0 });
      if (field === 'answers') stored.checkpoint!.answers = { q: 2 };
      if (field === 'position') stored.checkpoint!.position.value = 2;
      if (field === 'contentVersion') stored.contentVersion = 'b'.repeat(64);
      if (field === 'revision') stored.revision = 0;
      if (field === 'checkpointVersion') stored.checkpoint!.contentVersion = 'b'.repeat(64);
      if (field === 'checkpointRevision') stored.checkpoint!.revision = 2;
      return stored;
    }, 'quiz');
    await controller.load(); controller.update(draft(1)); expect(await controller.flush()).toBe(false);
    expect(controller.getSnapshot()).toMatchObject({ dirty: true, status: 'error', draft: draft(1) }); controller.dispose();
  });
  it('does not blindly retry conflicts or discard the draft', async () => {
    const transport = vi.fn<CheckpointTransport>().mockImplementation(async (method) => {
      if (method === 'GET') return response(); throw new CheckpointRequestError(409);
    });
    const controller = new CheckpointController(transport, 'quiz'); await controller.load(); controller.update(draft(1));
    expect(await controller.flush()).toBe(false); expect(await controller.flush()).toBe(false);
    expect(await controller.load()).toBe(false); expect(transport).toHaveBeenCalledTimes(2);
    expect(controller.getSnapshot().draft).toEqual(draft(1)); controller.dispose();
  });
  it('requires explicit discard/reset when content is stale', async () => {
    const writes: CheckpointInput[] = [];
    const controller = new CheckpointController(async (method, input) => {
      if (method === 'GET') return { ...response(), stale: true, revision: 3 };
      writes.push(input!); return response(input);
    }, 'quiz');
    expect(await controller.load()).toBe(false); controller.update(draft(1)); expect(await controller.flush()).toBe(false);
    expect(await controller.reset()).toBe(true); expect(writes[0]).toMatchObject({ reset: true, expectedRevision: 3, answers: {} }); controller.dispose();
  });
  it('disposal prevents a late read from populating a different lesson', async () => {
    const read = deferred<CheckpointResponse>(); const controller = new CheckpointController(() => read.promise, 'quiz');
    const load = controller.load(); controller.dispose(); read.resolve(response()); expect(await load).toBe(false);
    expect(controller.getSnapshot().response).toBeNull();
  });
  it('persists a newly opened lesson on pause even without an answer or scroll', async () => {
    const transport = vi.fn<CheckpointTransport>().mockImplementation(async (method, input) => method === 'GET' ? response() : response(input));
    const controller = new CheckpointController(transport, 'quiz'); await controller.load();
    expect(controller.getSnapshot()).toMatchObject({ dirty: true, status: 'pending' });
    expect(await controller.flush()).toBe(true); expect(transport.mock.calls.map(([method]) => method)).toEqual(['GET', 'PATCH']);
    expect(controller.getSnapshot().status).toBe('saved'); controller.dispose();
  });
  it('failed flush blocks a save-and-pause navigation', async () => {
    const controller = new CheckpointController(async (method) => { if (method === 'GET') return response(); throw new TypeError(); }, 'quiz');
    await controller.load(); controller.update(draft(1)); const navigate = vi.fn();
    if (await controller.flush()) navigate(); expect(navigate).not.toHaveBeenCalled(); controller.dispose();
  });
  it('focus access denial pauses editing and preserves dirty answers', async () => {
    const transport = vi.fn<CheckpointTransport>().mockResolvedValueOnce(response()).mockRejectedValue(new CheckpointRequestError(403));
    const controller = new CheckpointController(transport, 'quiz'); await controller.load(); controller.update(draft(1));
    expect(await controller.revalidate()).toBe(false); controller.update(draft(2));
    expect(controller.getSnapshot()).toMatchObject({ status: 'conflict', draft: draft(1), dirty: true }); controller.dispose();
  });
  it('single-request transport includes identity and never retries a failed POST', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError()); vi.stubGlobal('fetch', fetchMock);
    try { await expect(singleLearnerRequest('/attempt', 'learner', 'POST', { answers: {} })).rejects.toThrow();
      expect(fetchMock).toHaveBeenCalledTimes(1); expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: 'same-origin', cache: 'no-store', headers: { 'x-carsi-learner-id': 'learner' } });
    } finally { vi.unstubAllGlobals(); }
  });
  it('can explicitly retry a failed initial GET without attempting PATCH', async () => {
    const transport = vi.fn<CheckpointTransport>().mockRejectedValueOnce(new TypeError()).mockResolvedValue(response());
    const controller = new CheckpointController(transport, 'quiz'); expect(await controller.load()).toBe(false);
    expect(await controller.flush()).toBe(false); expect(await controller.load()).toBe(true);
    expect(transport.mock.calls.map(([method]) => method)).toEqual(['GET', 'GET']); controller.dispose();
  });
  it('changes hydration only for explicit reload/reset, never a save acknowledgement', async () => {
    let stored = response(); const controller = new CheckpointController(async (method, input) => {
      if (method === 'GET') return stored; stored = response(input); return stored;
    }, 'quiz');
    await controller.load(); const hydrated = controller.getSnapshot().hydration;
    controller.update(draft(1)); await controller.flush(); expect(controller.getSnapshot().hydration).toBe(hydrated);
    await controller.load(true); expect(controller.getSnapshot().hydration).toBe(hydrated + 1);
    await controller.reset(); expect(controller.getSnapshot().hydration).toBe(hydrated + 2);
    expect(controller.getSnapshot().draft?.answers).toEqual({}); controller.dispose();
  });
  it.each([401, 403, 404])('pauses editing after definitive access denial %s without a recovery GET', async (status) => {
    const transport = vi.fn<CheckpointTransport>().mockResolvedValueOnce(response()).mockRejectedValue(new CheckpointRequestError(status));
    const controller = new CheckpointController(transport, 'quiz'); await controller.load(); controller.update(draft(1));
    expect(await controller.flush()).toBe(false); controller.update(draft(2)); expect(transport).toHaveBeenCalledTimes(2);
    expect(controller.getSnapshot()).toMatchObject({ status: 'conflict', draft: draft(1) }); controller.dispose();
  });
  it('does not apply a late save acknowledgement after disposal', async () => {
    const ack = deferred<CheckpointResponse>(); let input: CheckpointInput | undefined;
    const controller = new CheckpointController(async (method, payload) => {
      if (method === 'GET') return response(); input = payload; return ack.promise;
    }, 'quiz');
    await controller.load(); controller.update(draft(1)); const save = controller.flush(); controller.dispose();
    ack.resolve(response(input)); expect(await save).toBe(false); expect(controller.getSnapshot().dirty).toBe(true);
  });
});

describe('checkpoint drafts preserve upstream assessment behavior', () => {
  const quiz = { id: 'quiz', title: 'Assessment', pass_percentage: 80, time_limit_minutes: null,
    attempts_allowed: 1, attempts_used: 0, questions: [{ id: 'question', question_text: 'First question',
      question_type: 'single_choice', options: [{ text: 'Answer' }], order_index: 0, points: 1 }] };
  it('keeps Begin assessment for a new empty checkpoint', () => {
    const markup = renderToStaticMarkup(createElement(QuizPlayer, { quiz, onSubmit: vi.fn(), initialDraft: { answers: {}, activeIndex: 0 } }));
    expect(markup).toContain('Begin assessment'); expect(markup).not.toContain('type="radio"');
  });
  it('restores a draft directly into the question with native selection truth', () => {
    const markup = renderToStaticMarkup(createElement(QuizPlayer, { quiz, onSubmit: vi.fn(), initialDraft: { answers: { question: 0 }, activeIndex: 0 } }));
    expect(markup).toContain('type="radio"'); expect(markup).toContain('checked=""'); expect(markup).not.toContain('Begin assessment');
  });
  it('never lets a resumed draft bypass the upstream exhausted-attempt ceiling', () => {
    const markup = renderToStaticMarkup(createElement(QuizPlayer, { quiz: { ...quiz, attempts_used: 1 }, onSubmit: vi.fn(),
      initialDraft: { answers: { question: 0 }, activeIndex: 0 } }));
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>Submit assessment<\/button>/);
  });
  it('retains the exhausted-attempt notice on the initial assessment screen', () => {
    const markup = renderToStaticMarkup(createElement(QuizPlayer, { quiz: { ...quiz, attempts_used: 1 }, onSubmit: vi.fn() }));
    expect(markup).toContain('No attempts remaining'); expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>Begin assessment<\/button>/);
  });
  it('preserves result counts and attempt feedback without claiming lesson completion', () => {
    const markup = renderToStaticMarkup(createElement(LearnerQuizResult, { passed: true, scorePercent: 100,
      passPercentage: 80, correctCount: 1, questionCount: 1, onContinue: vi.fn() }));
    expect(markup).toContain('Assessment passed'); expect(markup).toContain('1 / 1 correct'); expect(markup).not.toContain('Assessment complete');
  });
});
