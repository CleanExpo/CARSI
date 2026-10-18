/**
 * Quiz questions are written by admin course saves and the quiz seed scripts. Two things must
 * survive an ordinary re-write: authored explanations, and question ids. The lesson's content
 * version hashes the question ids, so a new id on an unchanged question makes every learner's
 * saved quiz go stale. An explanation supplied by the writer (seed JSON or admin input) always wins;
 * null or a blank string removes it, and only an absent field keeps the saved one.
 */
import type { Prisma } from '@/generated/prisma/client';

export type QuizQuestionInput = {
  questionText: string;
  options: string[];
  correctIndex: number;
  points?: number;
  explanation?: string | null;
};

export type QuizQuestionWriter = Pick<Prisma.TransactionClient, 'lmsQuizQuestion'>;

/** Stored options are `{ text }[]`, or plain strings on older rows; compare their text. */
function optionTexts(options: unknown): string[] | null {
  if (!Array.isArray(options)) return null;
  return options.map((o) =>
    typeof o === 'string'
      ? o
      : o && typeof o === 'object' && typeof (o as { text?: unknown }).text === 'string'
        ? (o as { text: string }).text
        : JSON.stringify(o)
  );
}

export function explanationFor(
  questionText: string,
  authored: string | null | undefined,
  prior: ReadonlyMap<string, string>
): string | null {
  if (authored === undefined) return prior.get(questionText.trim()) ?? null;
  return typeof authored === 'string' && authored.trim() ? authored.trim() : null;
}

/**
 * Write a quiz's questions. When the questions themselves are unchanged (same text, options,
 * answer and points, in the same order), only explanations can differ: update those rows in place
 * so question ids and the content version stay the same. Otherwise replace the questions,
 * carrying each saved explanation to the question with the same text.
 */
export async function writeQuizQuestions(
  db: QuizQuestionWriter,
  quizId: string,
  questions: readonly QuizQuestionInput[]
): Promise<void> {
  const current = await db.lmsQuizQuestion.findMany({
    where: { quizId },
    orderBy: { orderIndex: 'asc' },
    select: {
      id: true,
      questionText: true,
      options: true,
      correctIndex: true,
      points: true,
      explanation: true,
    },
  });
  const unchanged =
    current.length === questions.length &&
    current.every((row, i) => {
      const q = questions[i];
      return (
        row.questionText === q.questionText &&
        JSON.stringify(optionTexts(row.options)) === JSON.stringify(q.options) &&
        row.correctIndex === q.correctIndex &&
        row.points === (q.points ?? 1)
      );
    });
  if (unchanged) {
    for (let i = 0; i < current.length; i += 1) {
      const authored = questions[i].explanation;
      const next =
        authored === undefined ? current[i].explanation?.trim() || null : authored?.trim() || null;
      if (next !== (current[i].explanation ?? null)) {
        await db.lmsQuizQuestion.update({
          where: { id: current[i].id },
          data: { explanation: next },
        });
      }
    }
    return;
  }
  const prior = new Map(
    current
      .filter((row) => row.explanation?.trim())
      .map((row) => [row.questionText.trim(), row.explanation!.trim()] as const)
  );
  await db.lmsQuizQuestion.deleteMany({ where: { quizId } });
  for (let i = 0; i < questions.length; i += 1) {
    const q = questions[i];
    await db.lmsQuizQuestion.create({
      data: {
        quizId,
        questionText: q.questionText,
        options: q.options.map((text) => ({ text })),
        correctIndex: q.correctIndex,
        orderIndex: i,
        points: q.points ?? 1,
        explanation: explanationFor(q.questionText, q.explanation, prior),
      },
    });
  }
}
