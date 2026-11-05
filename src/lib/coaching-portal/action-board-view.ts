import type { CoachingActionStatus } from './types';

export type ActionBoardStat = {
  id: string;
  label: string;
  value: string;
  hint?: string;
  tone: 'neutral' | 'good' | 'warn';
};

const OPEN: CoachingActionStatus[] = ['todo', 'in_progress', 'blocked', 'proposed'];

export function actionBoardStats(
  items: Array<{ status: CoachingActionStatus }>
): ActionBoardStat[] {
  const open = items.filter((i) => OPEN.includes(i.status)).length;
  const done = items.filter((i) => i.status === 'done').length;
  const proposed = items.filter((i) => i.status === 'proposed').length;
  const blocked = items.filter((i) => i.status === 'blocked').length;
  return [
    {
      id: 'open',
      label: 'Open actions',
      value: String(open),
      hint: 'To do, in progress, blocked or awaiting coach',
      tone: open > 0 ? 'warn' : 'good',
    },
    {
      id: 'done',
      label: 'Completed',
      value: String(done),
      tone: done > 0 ? 'good' : 'neutral',
    },
    {
      id: 'coach',
      label: 'Awaiting coach',
      value: String(proposed),
      hint: 'Usually from your marketing pack',
      tone: proposed > 0 ? 'warn' : 'neutral',
    },
    {
      id: 'blocked',
      label: 'Blocked',
      value: String(blocked),
      tone: blocked > 0 ? 'warn' : 'neutral',
    },
  ];
}
