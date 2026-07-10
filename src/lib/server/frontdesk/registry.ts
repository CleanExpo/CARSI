/**
 * Front-desk tool registry (Phase 1).
 *
 * The single source of truth for the tools the assistant may call. Phase 1 holds
 * exactly one read-only tool. This is the seam that later extracts to
 * `@nexus/front-desk`, where each project supplies its own tool adapters.
 */

import { findCoursesTool } from './tools/find-courses';
import type { FrontDeskTool, ToolCall } from './types';

const TOOLS: readonly FrontDeskTool[] = [findCoursesTool];

/** All registered front-desk tools. */
export function getFrontDeskTools(): readonly FrontDeskTool[] {
  return TOOLS;
}

/** Look up a tool by the name the model used in a tool call. */
export function getFrontDeskTool(name: string): FrontDeskTool | undefined {
  return TOOLS.find((t) => t.name === name);
}

/** Render the registry as OpenAI/OpenRouter `tools` request payload. */
export function toolsForRequest(): Array<{
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}> {
  return TOOLS.map((t) => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}

/**
 * Execute a model-issued tool call against the registry. Unknown tools and
 * malformed argument JSON are returned as structured errors (never thrown) so the
 * streaming loop can hand the model a usable tool result and continue.
 */
export async function executeToolCall(call: ToolCall): Promise<string> {
  const tool = getFrontDeskTool(call.function.name);
  if (!tool) {
    return JSON.stringify({ error: `Unknown tool: ${call.function.name}` });
  }
  let args: Record<string, unknown>;
  try {
    args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
  } catch {
    return JSON.stringify({ error: 'Invalid tool arguments JSON' });
  }
  try {
    const result = await tool.execute(args);
    return JSON.stringify(result);
  } catch (e) {
    return JSON.stringify({ error: e instanceof Error ? e.message : 'Tool execution failed' });
  }
}
