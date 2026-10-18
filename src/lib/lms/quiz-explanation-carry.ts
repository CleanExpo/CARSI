/**
 * Quiz questions are rewritten by delete-and-recreate (admin course saves and the quiz seed
 * scripts). Without care that would erase every authored explanation on an ordinary save. Read
 * the existing explanations first and carry each one to the question with the same text.
 * An explanation supplied by the writer (seed JSON or admin input) always wins.
 */
export type ExplanationSource = {
  lmsQuizQuestion: {
    findMany(args: {
      where: { quizId: string };
      select: { questionText: true; explanation: true };
    }): Promise<{ questionText: string; explanation: string | null }[]>;
  };
};

export async function existingExplanations(
  db: ExplanationSource,
  quizId: string
): Promise<Map<string, string>> {
  const rows = await db.lmsQuizQuestion.findMany({
    where: { quizId },
    select: { questionText: true, explanation: true },
  });
  const out = new Map<string, string>();
  for (const row of rows) {
    const text = row.explanation?.trim();
    if (text) out.set(row.questionText.trim(), text);
  }
  return out;
}

export function explanationFor(
  questionText: string,
  authored: string | null | undefined,
  prior: ReadonlyMap<string, string>
): string | null {
  const own = typeof authored === 'string' ? authored.trim() : '';
  if (own) return own;
  return prior.get(questionText.trim()) ?? null;
}
