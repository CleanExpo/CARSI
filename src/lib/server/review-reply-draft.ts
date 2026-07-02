/**
 * AI-drafted instructor replies to course reviews (GP-118 — "AI Feedback Response").
 *
 * Reuses the same direct OpenAI chat-completions call the public chat assistant uses
 * (no SDK dependency). The draft is only a *suggestion* — the instructor edits and
 * publishes it via the reply endpoint, so this never posts anything on its own.
 */

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = process.env.OPENAI_CHAT_MODEL?.trim() || 'gpt-4o-mini';

export type ReviewReplyDraftInput = {
  courseTitle: string;
  rating: number;
  title: string | null;
  body: string | null;
};

type ChatMessage = { role: 'system' | 'user'; content: string };

/** Pure: build the chat messages for a courteous, on-brand instructor reply. */
export function buildReviewReplyMessages(input: ReviewReplyDraftInput): ChatMessage[] {
  const system = [
    'You draft short, warm, professional replies from a CARSI course instructor to a student review.',
    'CARSI is an Australian IICRC-aligned restoration training provider. Use Australian English spelling.',
    'Rules: thank the reviewer by sentiment (not by name); keep it 2–4 sentences; be specific to what they said;',
    'if the rating is low, acknowledge the concern sincerely and note it informs course improvements — never argue or make excuses;',
    'do not promise refunds, certifications, or outcomes; do not invent facts about the course; no marketing hype; no emojis.',
    'Return only the reply text, ready to publish.',
  ].join(' ');

  const parts = [`Course: ${input.courseTitle}`, `Rating: ${input.rating}/5`];
  if (input.title?.trim()) parts.push(`Review title: ${input.title.trim()}`);
  if (input.body?.trim()) parts.push(`Review: ${input.body.trim()}`);
  else parts.push('Review: (no written comment — a star rating only)');

  return [
    { role: 'system', content: system },
    { role: 'user', content: parts.join('\n') },
  ];
}

/**
 * Returns a suggested reply, or null if the model isn't configured or the call fails.
 * Callers treat null as "AI drafting unavailable" and fall back to writing manually.
 */
export async function draftReviewReply(input: ReviewReplyDraftInput): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  try {
    const res = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: buildReviewReplyMessages(input),
        temperature: 0.5,
        max_tokens: 220,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      console.error('[review-reply-draft] OpenAI error', res.status, await res.text().catch(() => ''));
      return null;
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (e) {
    console.error('[review-reply-draft]', e);
    return null;
  }
}
