/**
 * GP-630 (Coaching advantage A3) — "Ask my coach" server rules.
 *
 * Storage is injected (`AskCoachStore`) so the rules are tested without a database; the
 * Prisma store lives in `carsi-coaching-ask-coach-store.ts`. Isolation is structural:
 * - the coach is resolved from the member's own id, never from the request;
 * - a member's list is read by their own id only;
 * - a coach only sees and answers questions tagged with their own coach id.
 */
import {
  ASK_COACH_ANSWER_MAX,
  answerFromKnowledgeBase,
  normaliseQuestion,
  type AskCitation,
  type AskPassage,
  type CoachKnowledgeBase,
} from '@/lib/coaching-portal/ask-my-coach';

export type AskCoachQuestionRecord = {
  id: string;
  userId: string;
  coachId: string;
  question: string;
  /** Action-board status: 'todo' while open, 'done' once the coach answers. */
  status: string;
  coachAnswer: string | null;
  createdAt: Date;
  answeredAt: Date | null;
};

export type CoachInboxRecord = AskCoachQuestionRecord & { memberLabel: string };

export interface AskCoachStore {
  coachIdForMember(userId: string): Promise<string | null>;
  createQuestion(
    userId: string,
    input: { coachId: string; question: string }
  ): Promise<AskCoachQuestionRecord>;
  listQuestionsForMember(userId: string): Promise<AskCoachQuestionRecord[]>;
  listOpenQuestionsForCoach(coachId: string): Promise<CoachInboxRecord[]>;
  findQuestionForCoach(coachId: string, id: string): Promise<AskCoachQuestionRecord | null>;
  /** Writes the answer only if none exists yet; returns null when it was already answered. */
  saveCoachAnswer(id: string, answer: string): Promise<AskCoachQuestionRecord | null>;
}

export type KnowledgeBaseLookup = (coachId: string) => CoachKnowledgeBase | null;

export type AskMyCoachResult =
  | { status: 'answered'; passages: AskPassage[]; citations: AskCitation[] }
  | {
      status: 'sent_to_coach';
      reason: 'no_grounded_source' | 'compliance_topic';
      questionId: string;
    }
  | { status: 'no_coach' }
  | { status: 'invalid' };

export async function askMyCoach(
  store: AskCoachStore,
  knowledgeBaseFor: KnowledgeBaseLookup,
  userId: string,
  rawQuestion: unknown
): Promise<AskMyCoachResult> {
  const question = normaliseQuestion(rawQuestion);
  if (!question) return { status: 'invalid' };

  const coachId = await store.coachIdForMember(userId);
  if (!coachId) return { status: 'no_coach' };

  const kb = knowledgeBaseFor(coachId) ?? { coachId, items: [] };
  const answer = answerFromKnowledgeBase(question, kb);
  if (answer.status === 'answered') return answer;

  const row = await store.createQuestion(userId, { coachId, question });
  return { status: 'sent_to_coach', reason: answer.reason, questionId: row.id };
}

export type MemberQuestionView = {
  id: string;
  question: string;
  status: 'waiting' | 'answered';
  coachAnswer: string | null;
  askedAt: string;
  answeredAt: string | null;
};

function toMemberView(r: AskCoachQuestionRecord): MemberQuestionView {
  return {
    id: r.id,
    question: r.question,
    status: r.coachAnswer ? 'answered' : 'waiting',
    coachAnswer: r.coachAnswer,
    askedAt: r.createdAt.toISOString(),
    answeredAt: r.answeredAt ? r.answeredAt.toISOString() : null,
  };
}

export async function listMyCoachQuestions(
  store: AskCoachStore,
  userId: string
): Promise<MemberQuestionView[]> {
  return (await store.listQuestionsForMember(userId)).map(toMemberView);
}

export type CoachInboxView = {
  id: string;
  question: string;
  memberLabel: string;
  askedAt: string;
};

export async function listCoachInbox(
  store: AskCoachStore,
  coachId: string
): Promise<CoachInboxView[]> {
  return (await store.listOpenQuestionsForCoach(coachId)).map((r) => ({
    id: r.id,
    question: r.question,
    memberLabel: r.memberLabel,
    askedAt: r.createdAt.toISOString(),
  }));
}

export async function answerCoachQuestion(
  store: AskCoachStore,
  coachId: string,
  questionId: string,
  rawAnswer: unknown
): Promise<'answered' | 'not_found' | 'already_answered' | 'invalid'> {
  const answer = typeof rawAnswer === 'string' ? rawAnswer.trim() : '';
  if (!answer || answer.length > ASK_COACH_ANSWER_MAX) return 'invalid';

  const row = await store.findQuestionForCoach(coachId, questionId);
  if (!row) return 'not_found';
  if (row.coachAnswer !== null) return 'already_answered';

  const saved = await store.saveCoachAnswer(row.id, answer);
  return saved ? 'answered' : 'already_answered';
}
