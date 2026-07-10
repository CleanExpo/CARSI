/**
 * Front-desk tool registry (Phase 1 read tools + Phase 2 write tools).
 *
 * The single source of truth for the tools the assistant may call, and the seam
 * that extracts to `@nexus/front-desk`. Read tools always available; write tools
 * are opt-in per request (`includeWrite`) and gated by the write-tools flag +
 * signing secret upstream.
 */

import { findCoursesTool } from './tools/find-courses';
import { captureEnquiryTool } from './tools/capture-enquiry';
import type { FrontDeskTool, ToolCall, WriteTool, WriteToolProposal } from './types';

const READ_TOOLS: readonly FrontDeskTool[] = [findCoursesTool];
const WRITE_TOOLS: readonly WriteTool[] = [captureEnquiryTool];

export interface ToolSetOptions {
  /** Include confirm-gated write tools (caller must have checked the flag+secret). */
  includeWrite?: boolean;
}

/** The tools offered for a request. Write tools only when `includeWrite`. */
export function getFrontDeskTools(opts: ToolSetOptions = {}): readonly FrontDeskTool[] {
  return opts.includeWrite ? [...READ_TOOLS, ...WRITE_TOOLS] : READ_TOOLS;
}

/** Look up a tool by name within the given tool set. */
export function getFrontDeskTool(name: string, opts: ToolSetOptions = {}): FrontDeskTool | undefined {
  return getFrontDeskTools(opts).find((t) => t.name === name);
}

/** A registered write tool by name — used by the confirm endpoint to `commit`. */
export function getWriteTool(name: string): WriteTool | undefined {
  return WRITE_TOOLS.find((t) => t.name === name);
}

/** Render a tool set as OpenAI/OpenRouter `tools` request payload. */
export function toolsForRequest(opts: ToolSetOptions = {}): Array<{
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}> {
  return getFrontDeskTools(opts).map((t) => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}

export interface ToolCallResult {
  /** JSON string handed back to the model as the tool result. */
  forModel: string;
  /** Present when a write tool prepared a confirm-gated proposal (never committed here). */
  proposal?: WriteToolProposal;
}

/**
 * Execute a model-issued tool call. Read tools run and return data. Write tools
 * only **propose** (validate + sign) — never commit — and their token is returned
 * out-of-band via `proposal`, while the model sees only a "prepared, awaiting
 * confirmation" summary. Unknown tools / bad JSON / thrown validation become
 * structured errors so the loop can continue.
 */
export async function executeToolCall(
  call: ToolCall,
  tools: readonly FrontDeskTool[]
): Promise<ToolCallResult> {
  const tool = tools.find((t) => t.name === call.function.name);
  if (!tool) {
    return { forModel: JSON.stringify({ error: `Unknown tool: ${call.function.name}` }) };
  }
  let args: Record<string, unknown>;
  try {
    args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
  } catch {
    return { forModel: JSON.stringify({ error: 'Invalid tool arguments JSON' }) };
  }
  try {
    if (tool.readOnly) {
      const result = await tool.execute(args);
      return { forModel: JSON.stringify(result) };
    }
    const proposal = await tool.propose(args);
    return {
      forModel: JSON.stringify({
        prepared: true,
        summary: proposal.summary,
        awaiting_user_confirmation: true,
      }),
      proposal,
    };
  } catch (e) {
    return { forModel: JSON.stringify({ error: e instanceof Error ? e.message : 'Tool execution failed' }) };
  }
}
