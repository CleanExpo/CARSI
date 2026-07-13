/**
 * AI Front Desk — shared contracts (Phase 1 read tools + Phase 2 write tools).
 *
 * Transport- and provider-agnostic; the surface that extracts to
 * `@nexus/front-desk`. Keep it free of CARSI-specific or Prisma-specific imports.
 */

/** OpenAI/OpenRouter-compatible JSON-schema fragment describing a tool's params. */
export type JsonSchema = Record<string, unknown>;

interface BaseTool {
  /** Stable machine name sent to the model (snake_case). */
  readonly name: string;
  /** One-sentence description the model uses to decide when to call it. */
  readonly description: string;
  /** JSON-schema for the arguments object. */
  readonly parameters: JsonSchema;
}

/**
 * A read-only tool the model may call and whose result is fed straight back.
 * `execute` MUST NOT mutate external state.
 */
export interface ReadTool extends BaseTool {
  readonly readOnly: true;
  readonly requiresConfirmation?: false;
  execute(args: Record<string, unknown>): Promise<unknown>;
}

/**
 * A write tool. The model can only **propose** — `propose` validates the args
 * and returns a signed, short-TTL proposal token; it performs NO write. The
 * actual mutation happens only in `commit`, which the confirm endpoint calls
 * **after** verifying the token AND a human clicking Confirm. So the model can
 * never mutate state on its own, and prompt-injection has no path to a write.
 */
export interface WriteTool extends BaseTool {
  readonly readOnly: false;
  readonly requiresConfirmation: true;
  /** Validate args → signed proposal. NO side effects. Throws on invalid input. */
  propose(args: Record<string, unknown>): Promise<WriteToolProposal>;
  /** Execute the mutation. Called ONLY by the confirm endpoint post-verification. */
  commit(data: Record<string, unknown>, ctx: CommitContext): Promise<unknown>;
}

export type FrontDeskTool = ReadTool | WriteTool;

/** A tamper-proof proposal surfaced to the client for human confirmation. */
export interface WriteToolProposal {
  tool: string;
  /** Human- and model-facing one-liner of what Confirm will do. */
  summary: string;
  /** HMAC-signed, short-TTL token encoding the validated payload. */
  token: string;
  expiresAt: number;
}

/** Request-scoped context the confirm endpoint supplies to `commit`. */
export interface CommitContext {
  appOrigin: string;
  sourceIp: string | null;
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
