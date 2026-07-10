/**
 * AI Front Desk — shared contracts (Phase 1).
 *
 * These types are deliberately transport-agnostic and provider-agnostic: they are
 * the surface that later extracts to `@nexus/front-desk` and is reused across the
 * estate (RestoreAssist, Disaster Recovery, NRPG, CCW-CRM, Unite-Group). Keep them
 * free of CARSI-specific or Prisma-specific imports.
 */

/** OpenAI/OpenRouter-compatible JSON-schema fragment describing a tool's params. */
export type JsonSchema = Record<string, unknown>;

/**
 * A front-desk tool the assistant may call mid-conversation.
 *
 * Phase 1 INVARIANT: every tool is `readOnly: true`. Write actions (booking,
 * enrolment, CRM, email) arrive in Phase 2, each behind its own approval gate.
 * The `readOnly` literal is asserted by a unit test so a write tool cannot be
 * added to the registry without also changing this contract on purpose.
 */
export interface FrontDeskTool {
  /** Stable machine name sent to the model (snake_case). */
  readonly name: string;
  /** One-sentence description the model uses to decide when to call it. */
  readonly description: string;
  /** JSON-schema for the arguments object. */
  readonly parameters: JsonSchema;
  /** Phase 1: always true. A write tool would set this false and must be gated. */
  readonly readOnly: true;
  /** Execute the tool. MUST NOT mutate external state while `readOnly` is true. */
  execute(args: Record<string, unknown>): Promise<unknown>;
}

/** A minimal OpenAI/OpenRouter chat message (system/user/assistant/tool). */
export type FrontDeskMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string };

/** An assembled tool call as returned by the model. */
export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}
