#!/usr/bin/env node
/**
 * PreToolUse Bash hook: CARSI merges are Phill's only (Phill, 23/11/2026, by pop-up).
 *
 * Agents never mark a CARSI PR ready and never merge one. `gh pr ready --undo` (back to
 * draft) stays allowed. A claude.ai/code cloud session readied and merged #1286 and #1287
 * within about a minute of green CI; cloud sessions load hooks from this checkout, not
 * from ~/.claude, so this file is self-contained: Node built-ins only, no install needed.
 *
 * Claude Code contract: the tool call arrives as JSON on stdin; exit 2 blocks it and the
 * stderr text is shown to the agent; exit 0 allows it. Anything this hook cannot read is
 * refused (fail closed). It is a tripwire for ordinary commands, not containment: code a
 * shell runs without naming it here (a script file, a Makefile target, another HTTP
 * client) is not seen. Tests: .claude/hooks/founder-merge-only.test.mjs.
 */
import { readFileSync } from 'node:fs';

const RULE =
  "CARSI merges are Phill's only (ruled 23/11/2026): agents never run `gh pr ready` " +
  '(except a plain `--undo`) or `gh pr merge` on this repository. Leave the PR as a draft ' +
  'for Phill.';

// gh global flags that take a value, so the word after them is not the command.
const VALUE_FLAGS = new Set(['-R', '--repo', '--hostname']);
// GraphQL mutations that ready or merge a PR, and REST writes that do the same.
const API_MUTATION = /mergePullRequest|markPullRequestReadyForReview|enablePullRequestAutoMerge/;
const API_MERGE_PATH = /pulls\/[^/\s'"]+\/merge\b/;
const API_DRAFT_FIELD = /\bdraft=(false|0)\b/;
const GH_WORD = /(^|[\s/;&|(`'"])gh(\.exe)?(?=[\s'"`]|$)/;

/** Split a command line into shell words per segment. Throws on unbalanced quotes. */
export function segments(command) {
  // Substitutions run as commands of their own: treat their edges as separators.
  const text = command.replace(/\$\(|`|\)/g, ' ; ');
  const out = [[]];
  let word = null;
  let quote = null;
  const push = () => {
    if (word !== null) out[out.length - 1].push(word);
    word = null;
  };
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quote) {
      if (c === quote) quote = null;
      else if (c === '\\' && quote === '"' && i + 1 < text.length) word += text[(i += 1)];
      else word += c;
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      word = word ?? '';
    } else if (c === '\\' && i + 1 < text.length) {
      word = (word ?? '') + text[(i += 1)];
    } else if (/\s/.test(c) && c !== '\n') {
      push();
    } else if (c === '\n' || c === ';' || c === '&' || c === '|') {
      push();
      if (out[out.length - 1].length) out.push([]);
    } else {
      word = (word ?? '') + c;
    }
  }
  if (quote) throw new Error('unbalanced quote');
  push();
  return out.filter((s) => s.length);
}

/** The gh pr action of one segment (`merge`, `ready`, ...), or null. */
function prAction(tokens) {
  const gh = tokens.findIndex((t) => /(^|\/)gh(\.exe)?$/.test(t));
  if (gh === -1) return null;
  let i = gh + 1;
  while (i < tokens.length && tokens[i].startsWith('-')) {
    i += VALUE_FLAGS.has(tokens[i]) ? 2 : 1;
  }
  if (tokens[i] !== 'pr') return null;
  i += 1;
  while (i < tokens.length && tokens[i].startsWith('-')) {
    i += VALUE_FLAGS.has(tokens[i]) ? 2 : 1;
  }
  return tokens[i] ?? null;
}

/** True only when the LAST --undo flag is a plain on: `--undo` or `--undo=true`. */
function undoEffective(tokens) {
  const undo = tokens.filter((t) => t === '--undo' || t.startsWith('--undo='));
  return undo.length > 0 && ['--undo', '--undo=true'].includes(undo[undo.length - 1]);
}

function gatedSegment(tokens) {
  const hash = tokens.findIndex((t) => t.startsWith('#'));
  const words = hash === -1 ? tokens : tokens.slice(0, hash);
  const action = prAction(words);
  if (action === 'merge') return true; // MERGE-CHECK
  if (action === 'ready') return !undoEffective(words); // READY-CHECK
  const gh = words.findIndex((t) => /(^|\/)gh(\.exe)?$/.test(t));
  if (gh !== -1 && words[gh + 1] === 'api') {
    const rest = words.slice(gh + 2).join(' ');
    if (API_MUTATION.test(rest) || API_MERGE_PATH.test(rest)) return true;
    const pullsWord = words.slice(gh + 2).some((w) => /pulls\/[^/\s]+\/?$/.test(w));
    if (pullsWord && API_DRAFT_FIELD.test(rest)) return true;
  }
  return false;
}

/** True when the command readies or merges a PR, looking inside quoted words too. */
export function refuses(command, depth = 0) {
  if (depth > 4) return GH_WORD.test(command);
  let parsed;
  try {
    parsed = segments(command);
  } catch {
    return GH_WORD.test(command); // unreadable: refuse anything that could be gh
  }
  for (const tokens of parsed) {
    if (gatedSegment(tokens)) return true;
    // `sh -c '...'`, `eval "..."`: a quoted word can hold a whole command line.
    for (const t of tokens) {
      if (/\s/.test(t) && GH_WORD.test(t) && refuses(t, depth + 1)) return true;
    }
  }
  return false;
}

function main() {
  let payload;
  try {
    payload = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    process.stderr.write(`BLOCKED: unreadable hook payload. ${RULE}\n`);
    return 2;
  }
  const input = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload.tool_input : null;
  if (!input || typeof input !== 'object') {
    process.stderr.write(`BLOCKED: hook payload has no tool_input. ${RULE}\n`);
    return 2;
  }
  const command = String(input.command ?? '');
  if (command.trim() && refuses(command)) {
    process.stderr.write(`BLOCKED: ${RULE}\n`);
    return 2;
  }
  return 0;
}

process.exitCode = main();
