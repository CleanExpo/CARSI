import { describe, expect, it } from 'vitest';

import { actionBoardStats } from './action-board-view';

describe('actionBoardStats', () => {
  it('counts open, done, proposed and blocked separately', () => {
    const stats = actionBoardStats([
      { status: 'todo' },
      { status: 'proposed' },
      { status: 'done' },
      { status: 'blocked' },
    ]);
    expect(stats.find((s) => s.id === 'open')?.value).toBe('3');
    expect(stats.find((s) => s.id === 'done')?.value).toBe('1');
    expect(stats.find((s) => s.id === 'coach')?.value).toBe('1');
  });
});
