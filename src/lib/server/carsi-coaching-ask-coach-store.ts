/**
 * GP-630 — Prisma store for "Ask my coach".
 *
 * No new table: an escalated question is a row on the member's coaching action board
 * (`carsi_coaching_actions`), assigned to the coach and tagged `ask-coach:<coachId>` in
 * `goal_id`, the same way GP-633 tags prescribed courses. The coach's answer is written to
 * `coach_feedback`, once.
 */
import { askCoachGoalId, ASK_COACH_GOAL_PREFIX } from '@/lib/coaching-portal/ask-my-coach';
import { DEFAULT_COACHING_COACH } from '@/lib/coaching-portal/coach-routing';
import { prisma } from '@/lib/prisma';
import type { AskCoachQuestionRecord, AskCoachStore } from '@/lib/server/carsi-coaching-ask-coach';

const QUESTION_TITLE_MAX = 500;

type ActionRow = {
  id: string;
  userId: string;
  goalId: string | null;
  title: string;
  description: string | null;
  status: string;
  coachFeedback: string | null;
  createdAt: Date;
  completedAt: Date | null;
};

const SELECT = {
  id: true,
  userId: true,
  goalId: true,
  title: true,
  description: true,
  status: true,
  coachFeedback: true,
  createdAt: true,
  completedAt: true,
} as const;

function toRecord(r: ActionRow): AskCoachQuestionRecord {
  return {
    id: r.id,
    userId: r.userId,
    coachId: (r.goalId ?? '').slice(ASK_COACH_GOAL_PREFIX.length),
    // The full question is kept in description; the title is the board-sized version.
    question: r.description ?? r.title,
    status: r.status,
    coachAnswer: r.coachFeedback,
    createdAt: r.createdAt,
    answeredAt: r.coachFeedback ? r.completedAt : null,
  };
}

export const prismaAskCoachStore: AskCoachStore = {
  async coachIdForMember() {
    // One coach until GP-632 (A5) adds member-to-coach assignment. The route has already
    // confirmed the caller is an entitled coaching member.
    return DEFAULT_COACHING_COACH.id;
  },

  async createQuestion(userId, { coachId, question }) {
    const row = await prisma.carsiCoachingAction.create({
      data: {
        userId,
        title:
          question.length > QUESTION_TITLE_MAX
            ? `${question.slice(0, QUESTION_TITLE_MAX - 1)}…`
            : question,
        description: question,
        status: 'todo',
        assignedTo: 'coach',
        goalId: askCoachGoalId(coachId),
        sortOrder: -1,
      },
      select: SELECT,
    });
    return toRecord(row);
  },

  async listQuestionsForMember(userId) {
    const rows = await prisma.carsiCoachingAction.findMany({
      where: { userId, goalId: { startsWith: ASK_COACH_GOAL_PREFIX } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: SELECT,
    });
    return rows.map(toRecord);
  },

  async listOpenQuestionsForCoach(coachId) {
    const rows = await prisma.carsiCoachingAction.findMany({
      where: { goalId: askCoachGoalId(coachId), coachFeedback: null },
      orderBy: { createdAt: 'asc' },
      take: 100,
      select: { ...SELECT, user: { select: { fullName: true, email: true } } },
    });
    return rows.map((r) => ({
      ...toRecord(r),
      memberLabel: r.user.fullName?.trim() || r.user.email,
    }));
  },

  async findQuestionForCoach(coachId, id) {
    const row = await prisma.carsiCoachingAction.findFirst({
      where: { id, goalId: askCoachGoalId(coachId) },
      select: SELECT,
    });
    return row ? toRecord(row) : null;
  },

  async saveCoachAnswer(id, answer) {
    // Conditional update: only the first answer lands, even if two are submitted at once.
    const now = new Date();
    const { count } = await prisma.carsiCoachingAction.updateMany({
      where: { id, coachFeedback: null },
      data: { coachFeedback: answer, status: 'done', completedAt: now },
    });
    if (count === 0) return null;
    const row = await prisma.carsiCoachingAction.findUnique({ where: { id }, select: SELECT });
    return row ? toRecord(row) : null;
  },
};

export function getAskCoachStore(): AskCoachStore {
  return prismaAskCoachStore;
}
