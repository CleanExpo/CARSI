/**
 * Corrective feedback after a quiz attempt. A wrong answer teaches nothing unless the learner sees
 * why, so each question may carry an explanation written by a practitioner. Only explanations for
 * questions the learner got wrong (or skipped) are returned, and never the correct option itself,
 * so a learner with attempts left still has to work the answer out.
 *
 * Explanations are authored content: never generated from IICRC standard text (CLAUDE.md).
 */
export type QuizFeedbackItem = { question_id: string; question_text: string; explanation: string };

export const MAX_EXPLANATION_CHARS = 2000;

export function buildQuizFeedback(
  questions: ReadonlyArray<{ id: string; questionText: string; correctIndex: number }>,
  answers: Readonly<Record<string, unknown>>,
  explanations: ReadonlyMap<string, string | null | undefined>
): QuizFeedbackItem[] {
  const out: QuizFeedbackItem[] = [];
  for (const q of questions) {
    if (answers[q.id] === q.correctIndex) continue;
    const text = explanations.get(q.id)?.trim();
    if (!text) continue;
    out.push({
      question_id: q.id,
      question_text: q.questionText,
      explanation: text.slice(0, MAX_EXPLANATION_CHARS),
    });
  }
  return out;
}
