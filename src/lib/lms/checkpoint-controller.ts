import type { CheckpointInput, CheckpointResponse, LessonPosition } from './lesson-checkpoint';

export type CheckpointDraft = { position: LessonPosition; answers: Record<string, number> };
export type CheckpointStatus = 'loading' | 'pending' | 'saving' | 'saved' | 'error' | 'conflict';
export type CheckpointState = { status: CheckpointStatus; response: CheckpointResponse | null;
  draft: CheckpointDraft | null; dirty: boolean; error: string | null; hydration: number };
export type CheckpointTransport = (method: 'GET' | 'PATCH', input?: CheckpointInput) => Promise<CheckpointResponse>;

export class CheckpointRequestError extends Error {
  constructor(public status: number) { super(`Checkpoint request failed (${status})`); }
}

function same(a: CheckpointDraft, b: CheckpointDraft) {
  return a.position.kind === b.position.kind && a.position.value === b.position.value &&
    Object.keys(a.answers).length === Object.keys(b.answers).length &&
    Object.entries(a.answers).every(([id, answer]) => b.answers[id] === answer);
}

export class CheckpointController {
  private state: CheckpointState = { status: 'loading', response: null, draft: null, dirty: false, error: null, hydration: 0 };
  private listeners = new Set<() => void>();
  private generation = 0;
  private disposed = false;
  private saving: Promise<boolean> | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  constructor(private transport: CheckpointTransport, private kind: LessonPosition['kind']) {}
  getSnapshot = () => this.state;
  activate() { this.disposed = false; }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(update: Partial<CheckpointState>) {
    if (this.disposed) return;
    this.state = { ...this.state, ...update };
    this.listeners.forEach((listener) => listener());
  }
  async load(discard = false): Promise<boolean> {
    if (this.state.dirty && !discard) return false;
    const generation = ++this.generation;
    this.publish({ status: 'loading', error: null });
    try {
      const response = await this.transport('GET');
      if (this.disposed || generation !== this.generation) return false;
      const draft = response.stale ? null : response.checkpoint ?
        { position: { ...response.checkpoint.position }, answers: { ...response.checkpoint.answers } } :
        { position: { kind: response.content.quiz ? 'quiz' as const : this.kind, value: 0 }, answers: {} };
      this.publish({ response, draft, dirty: !response.stale && !response.checkpoint, hydration: this.state.hydration + 1,
        status: response.stale ? 'conflict' : response.checkpoint ? 'saved' : 'pending',
        error: response.stale ? 'Lesson content changed. Reset the saved draft to continue.' : null });
      return !response.stale;
    } catch (error) {
      if (generation === this.generation) this.publish({ status: this.state.draft ? 'conflict' : 'error', error: error instanceof Error ? error.message : 'Checkpoint unavailable' });
      return false;
    }
  }
  async revalidate(): Promise<boolean> {
    if (this.saving) await this.saving;
    const generation = this.generation;
    try {
      const response = await this.transport('GET');
      if (this.disposed || generation !== this.generation) return false;
      if (this.state.response && (response.stale || response.contentVersion !== this.state.response.contentVersion ||
        response.revision !== this.state.response.revision)) {
        this.publish({ status: 'conflict', error: 'Saved content changed in another session. Choose whether to discard this draft.' }); return false;
      }
      this.publish({ response }); return true;
    } catch {
      this.publish({ status: 'conflict', error: 'Learner access could not be verified. Editing is paused.' }); return false;
    }
  }
  update(draft: CheckpointDraft) {
    if (!this.state.draft || !this.state.response || this.state.status === 'conflict' || this.state.status === 'loading' || this.disposed) return;
    if (same(draft, this.state.draft)) return;
    this.publish({ draft: { position: { ...draft.position }, answers: { ...draft.answers } }, dirty: true,
      status: this.saving ? 'saving' : 'pending', error: null });
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { void this.flush(); }, 700);
  }
  async flush(): Promise<boolean> {
    clearTimeout(this.timer);
    if (this.disposed || this.state.status === 'loading' || this.state.status === 'conflict' || !this.state.draft || !this.state.response) return false;
    if (this.saving) { const success = await this.saving; return success ? this.flush() : false; }
    if (!this.state.dirty) return this.state.status === 'saved';
    this.saving = this.write(false);
    const success = await this.saving;
    this.saving = null;
    return success && this.state.dirty ? this.flush() : success;
  }
  private async write(reset: boolean): Promise<boolean> {
    const { response, draft } = this.state;
    if (!response || !draft) return false;
    const generation = this.generation;
    const input: CheckpointInput = { ...draft, answers: { ...draft.answers }, position: { ...draft.position },
      contentVersion: response.contentVersion, expectedRevision: response.revision, ...(reset ? { reset: true } : {}) };
    this.publish({ status: 'saving', error: null });
    let acknowledged: CheckpointResponse;
    try { acknowledged = await this.transport('PATCH', input); }
    catch (error) {
      if (this.disposed || generation !== this.generation) return false;
      if (error instanceof CheckpointRequestError && error.status === 409) {
        this.publish({ status: 'conflict', error: 'Another session or a content change conflicts with this draft.' });
        return false;
      }
      if (error instanceof CheckpointRequestError && [401, 403, 404].includes(error.status)) {
        this.publish({ status: 'conflict', error: 'Learner access could not be verified. Editing is paused.' }); return false;
      }
      try {
        acknowledged = await this.transport('GET');
        if (acknowledged.stale || acknowledged.contentVersion !== input.contentVersion ||
          acknowledged.revision <= input.expectedRevision || !acknowledged.checkpoint ||
          acknowledged.checkpoint.contentVersion !== input.contentVersion || acknowledged.checkpoint.revision !== acknowledged.revision ||
          !same(acknowledged.checkpoint, input)) throw error;
      } catch {
        this.publish({ status: 'error', error: 'Save not confirmed. Your draft is still here; reconnect and save again.' });
        return false;
      }
    }
    if (this.disposed || generation !== this.generation) return false;
    if (acknowledged.contentVersion !== input.contentVersion || acknowledged.revision <= input.expectedRevision ||
      !acknowledged.checkpoint || acknowledged.checkpoint.contentVersion !== input.contentVersion ||
      acknowledged.checkpoint.revision !== acknowledged.revision || !same(acknowledged.checkpoint, input)) {
      this.publish({ status: 'conflict', error: 'Save acknowledgement does not match this draft.' }); return false;
    }
    const dirty = !this.state.draft || !same(this.state.draft, input);
    this.publish({ response: acknowledged, dirty, status: dirty ? 'pending' : 'saved',
      hydration: this.state.hydration + (reset ? 1 : 0) });
    return true;
  }
  async reset(): Promise<boolean> {
    if (this.disposed || this.saving || !this.state.response) return false;
    this.publish({ draft: { position: { kind: this.state.response.content.quiz ? 'quiz' : this.kind, value: 0 }, answers: {} }, dirty: true });
    this.saving = this.write(true);
    const success = await this.saving; this.saving = null;
    return success;
  }
  dispose() { this.disposed = true; this.generation++; clearTimeout(this.timer); this.listeners.clear(); }
}

export async function singleLearnerRequest<T>(url: string, userId: string, method = 'GET', body?: unknown,
  signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(15000);
  const response = await fetch(url, { method, credentials: 'same-origin', cache: 'no-store',
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    headers: { 'x-carsi-learner-id': userId, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  if (!response.ok) throw new CheckpointRequestError(response.status);
  return response.json() as Promise<T>;
}
