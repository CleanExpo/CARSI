import { afterEach, describe, expect, it, vi } from 'vitest';
import { bindReadingPosition } from './LessonPlayer';

function fixture(overflow = 'auto', withParent = true) {
  const listeners = new Map<string, () => void>();
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrame = 0;
  const pageBody = { parentElement: null };
  const ownerDocument = { body: pageBody, documentElement: {} };
  const root = { parentElement: pageBody, ownerDocument, clientHeight: 600, clientTop: 2, scrollTop: 200,
    getBoundingClientRect: () => ({ top: 100 }),
    addEventListener: vi.fn((name: string, listener: () => void) => listeners.set(name, listener)),
    removeEventListener: vi.fn((name: string) => listeners.delete(name)),
    scrollTo: vi.fn((options: ScrollToOptions) => { root.scrollTop = options.top ?? 0; }) };
  const windowListeners = new Map<string, () => void>();
  const windowMock = { innerHeight: 800, scrollY: 100,
    getComputedStyle: vi.fn((element: unknown) => ({ overflowY: element === root ? overflow : 'visible' })),
    addEventListener: vi.fn((name: string, listener: () => void) => windowListeners.set(name, listener)),
    removeEventListener: vi.fn((name: string) => windowListeners.delete(name)),
    scrollTo: vi.fn((options: ScrollToOptions) => { windowMock.scrollY = options.top ?? 0; }) };
  const body = { parentElement: withParent ? root : pageBody, ownerDocument, offsetHeight: 1600,
    getBoundingClientRect: () => ({ top: withParent ? 702 - root.scrollTop : 400 - windowMock.scrollY }) };
  vi.stubGlobal('window', windowMock);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => frames.delete(id)));
  const next = () => { const frame = frames.entries().next().value; if (frame) { frames.delete(frame[0]); frame[1](0); } };
  return { body: body as unknown as HTMLElement, root, windowMock, listeners, windowListeners, frames, next };
}

afterEach(() => vi.unstubAllGlobals());

describe('reading checkpoints use the actual scroll viewport', () => {
  it('restores inside dashboard main and records subsequent native-container scroll', () => {
    const f = fixture(); const position = vi.fn(); const cleanup = bindReadingPosition(f.body, 5000, position);
    expect(f.root.addEventListener).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });
    expect(f.windowMock.addEventListener).not.toHaveBeenCalled();
    f.next(); expect(f.root.scrollTo).toHaveBeenCalledWith({ top: 1100, behavior: 'instant' });
    expect(f.windowMock.scrollTo).not.toHaveBeenCalled();
    f.listeners.get('scroll')?.(); expect(position).not.toHaveBeenCalled();
    f.next(); f.root.scrollTop = 1350; f.listeners.get('scroll')?.();
    expect(position).toHaveBeenLastCalledWith(7500); cleanup(); expect(f.listeners.size).toBe(0);
  });
  it('keeps window fallback for a page without a native scrolling ancestor', () => {
    const f = fixture('visible', false); const position = vi.fn(); const cleanup = bindReadingPosition(f.body, 5000, position);
    f.next(); expect(f.windowMock.scrollTo).toHaveBeenCalledWith({ top: 800, behavior: 'instant' });
    f.next(); f.windowMock.scrollY = 1000; f.windowListeners.get('scroll')?.();
    expect(position).toHaveBeenLastCalledWith(7500); cleanup(); expect(f.windowListeners.size).toBe(0);
  });
  it('ignores overflow-hidden wrappers when choosing the scroll viewport', () => {
    const f = fixture('hidden'); const cleanup = bindReadingPosition(f.body, 0, vi.fn());
    expect(f.windowMock.addEventListener).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });
    expect(f.root.addEventListener).not.toHaveBeenCalled(); cleanup();
  });
  it('clamps offsets and treats short content as the beginning instead of dividing by zero', () => {
    const f = fixture(); const position = vi.fn(); const cleanup = bindReadingPosition(f.body, 0, position);
    f.next(); f.next(); f.root.scrollTop = 0; f.listeners.get('scroll')?.(); expect(position).toHaveBeenLastCalledWith(0);
    f.root.scrollTop = 10000; f.listeners.get('scroll')?.(); expect(position).toHaveBeenLastCalledWith(10000);
    Object.assign(f.body, { offsetHeight: 300 }); f.listeners.get('scroll')?.(); expect(position).toHaveBeenLastCalledWith(0); cleanup();
  });
  it('disposal cancels both restoration frames and removes the actual listener', () => {
    const f = fixture(); const position = vi.fn(); const cleanup = bindReadingPosition(f.body, 5000, position);
    f.next(); expect(f.frames.size).toBe(1); cleanup(); expect(f.frames.size).toBe(0);
    expect(f.root.removeEventListener).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(f.windowMock.removeEventListener).not.toHaveBeenCalled(); expect(position).not.toHaveBeenCalled();
  });
});
