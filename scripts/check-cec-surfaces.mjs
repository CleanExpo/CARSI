#!/usr/bin/env node
/**
 * CEC surface-leak guard (licence-critical) — the STRUCTURAL backstop (GP-498).
 *
 * WHY THIS EXISTS. `check-iicrc-compliance.mjs` scans authored *copy* for banned phrasings.
 * It cannot see application code, so a whole class of leak slipped past it: a page,
 * component, PDF, email or API route that reads the RAW course CEC value and renders a CEC
 * display / eligibility / marketing signal WITHOUT going through the approvals registry.
 * Patching those surfaces one-by-one did not converge (6 review cycles) because nothing
 * mechanically enumerated them. This guard is that enumeration.
 *
 * WHY AN AST (not a line regex). A line-based scan misses computed access
 * (`course['cecHours']`), aliased / multiline destructuring, and Prisma selects that a
 * whole-record spread then serialises — real leak shapes. This walks the TypeScript AST so
 * those shapes cannot slip through, and fails LOUDLY on unreadable files (a silent skip is a
 * blind spot).
 *
 * THE STRUCTURAL BOUNDARY. The raw Prisma / catalog column is camelCase `cecHours`. Outside
 * the allow-listed accessor + admin-edit cluster, application code MUST NOT:
 *   1. read `cecHours` — member access, computed access, or (aliased/multiline) destructure; or
 *   2. SELECT the raw column (`cecHours: true` in a Prisma select) — that lets a spread
 *      serialise it into an output without any property read; or
 *   3. use `iicrcDiscipline` / `iicrc_discipline` as a CEC / eligibility boolean (a non-empty
 *      discipline is NOT IICRC approval — that was the fail-open leak, GP-498).
 * The resolved display value flows as the snake_case DTO field `cec_hours` (the gate output)
 * or under the distinct name `resolvedCecHours` / `cecHoursLabel`, and is not scanned.
 *
 * Fix a flagged surface by routing it through `resolveLmsCourseCecHours` /
 * `getApprovedCecHours` / `courseEligibleForIicrcCecSubmission`, never by weakening this guard.
 *
 * KNOWN LIMIT (documented, not hidden): a name-based rule cannot chase an arbitrary rename of
 * the raw value into a fresh local before it is rendered. That is bounded here by ALSO
 * forbidding the raw column from being selected/read outside the cluster, so a raw value
 * cannot legitimately enter a surface to be renamed. Full type-flow proof would need the type
 * checker; this is the deterministic backstop.
 *
 *   node scripts/check-cec-surfaces.mjs     # scan tracked app code (CI + manual)
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const RAW_FIELD = 'cecHours';
const DISCIPLINE_NAMES = new Set(['iicrcDiscipline', 'iicrc_discipline']);

/** Application code to scan. Components and lib live under src/ in this repo; the extra
 *  top-level dirs are included defensively in case that ever changes. */
const SCANNED_DIRS = ['app/', 'src/', 'components/', 'lib/'];
const CODE_EXT = /\.(tsx?|jsx?)$/;

/**
 * Accessor cluster — reading / selecting the raw `cecHours` column and deciding CEC
 * eligibility is the whole job of these modules; they are the ONE place the raw value is
 * legitimately handled. A course only becomes CEC-bearing through code in this list.
 */
const ACCESSOR_ALLOWLIST = [
  'src/lib/seed/cec-approvals.ts',          // getApprovedCecHours — registry SSOT
  'src/lib/seed/cec-hours.ts',              // resolveCecHours / resolveCatalogCecHours
  'src/lib/seed/cec-remediation.ts',        // registry-backed remediation of stale hours
  'src/lib/server/course-cec-hours.ts',     // resolveLmsCourseCecHours / label
  'src/lib/server/iicrc-cec-submission.ts', // resolvedCecHoursForCourse + submission
  'src/lib/server/iicrc-cec-config.ts',     // resolveEffectiveCecHours / courseEligibleForIicrcCecSubmission
  'src/lib/server/iicrc-cec-email.ts',      // formats the already-resolved submission value
  'src/lib/server/renewal-summary.ts',      // registry-backed renewal resolver (getApprovedCecHours)
  'src/lib/cec-display.ts',                 // formatCecHoursForDisplay — pure formatter
  'src/lib/course-kit/cec-guard.ts',        // course-kit CEC guard infra

  // Admin edit / write cluster. These are the founder's course-management surfaces: they read
  // the RAW stored `cecHours` so it can be EDITED, always alongside the resolved registry
  // figure (`resolvedCecHours` / `cecMissing`). They are not public display / eligibility /
  // marketing surfaces — the admin "N CEC" badge itself derives from the resolved value.
  'src/lib/admin/admin-courses-service.ts',            // courseToAdminDto — raw beside resolvedCecHours
  'src/components/admin/courses/CourseEditorForm.tsx', // editor prefill of the raw stored value
  'app/api/admin/iicrc-cec-submissions/route.ts',      // admin submission override input
  'app/api/admin/iicrc-cec-submissions/process/route.ts',
];

function inScope(f) {
  const n = f.replace(/\\/g, '/');
  return SCANNED_DIRS.some((d) => n.startsWith(d));
}
function isExempt(f) {
  const n = f.replace(/\\/g, '/');
  if (/(?:\.test\.|\.spec\.)/.test(n)) return true; // unit tests exercise the accessors directly
  if (/(?:^|\/)__tests__\//.test(n) || /(?:^|\/)__fixtures__\//.test(n)) return true;
  return ACCESSOR_ALLOWLIST.some((e) => n === e || n.endsWith('/' + e));
}

function propName(nameNode) {
  if (!nameNode) return undefined;
  if (ts.isIdentifier(nameNode) || ts.isPrivateIdentifier(nameNode)) return nameNode.text;
  if (ts.isStringLiteralLike(nameNode)) return nameNode.text;
  return undefined;
}

// Is `node` used as a boolean / eligibility test (not a display default or plain value)?
function inBooleanContext(node) {
  let cur = node;
  let parent = node.parent;
  while (parent) {
    if (ts.isParenthesizedExpression(parent)) {
      cur = parent;
      parent = parent.parent;
      continue;
    }
    if (ts.isIfStatement(parent) && parent.expression === cur) return true;
    if (ts.isWhileStatement(parent) && parent.expression === cur) return true;
    if (ts.isConditionalExpression(parent) && parent.condition === cur) return true;
    if (ts.isPrefixUnaryExpression(parent) && parent.operator === ts.SyntaxKind.ExclamationToken) return true;
    if (ts.isBinaryExpression(parent)) {
      const op = parent.operatorToken.kind;
      if (
        op === ts.SyntaxKind.AmpersandAmpersandToken ||
        op === ts.SyntaxKind.BarBarToken ||
        op === ts.SyntaxKind.EqualsEqualsEqualsToken ||
        op === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
        op === ts.SyntaxKind.EqualsEqualsToken ||
        op === ts.SyntaxKind.ExclamationEqualsToken
      ) {
        return true;
      }
      // Nullish `??` / other operators: keep climbing (a display default is not eligibility).
      cur = parent;
      parent = parent.parent;
      continue;
    }
    if (ts.isCallExpression(parent)) {
      const callee = parent.expression;
      if (ts.isIdentifier(callee) && callee.text === 'Boolean') return true;
      return false;
    }
    return false;
  }
  return false;
}

// CEC / eligibility proximity. Substring (not \b-anchored) so it matches camelCase-embedded
// tokens like `cecApproved` / `isCecEligible` that a word-boundary rule would miss.
const CEC_PROXIMITY = /(cec|eligib|submit|submission|approv)/i;

function enclosingFunctionName(node, sf) {
  let p = node.parent;
  while (p && !ts.isSourceFile(p)) {
    if (
      (ts.isFunctionDeclaration(p) || ts.isFunctionExpression(p) || ts.isMethodDeclaration(p)) &&
      p.name
    ) {
      return p.name.getText(sf);
    }
    if (ts.isVariableDeclaration(p) && p.name) return p.name.getText(sf); // const isX = () => ...
    p = p.parent;
  }
  return '';
}

// The TIGHT decision context for a discipline read: the smallest boolean expression it drives,
// plus the thing that expression feeds (an eligibility-named variable / property / function
// return / if-statement body). This is deliberately narrow so a discipline read used for a
// DISPLAY string or a `x || null` value fallback does NOT get swept up by an unrelated CEC
// word elsewhere in the function.
function decisionContextText(node, sf) {
  let top = node;
  let parent = top.parent;
  // Climb through the boolean-forming operators around the read.
  while (parent) {
    if (ts.isParenthesizedExpression(parent)) { top = parent; parent = parent.parent; continue; }
    if (ts.isPrefixUnaryExpression(parent) && parent.operator === ts.SyntaxKind.ExclamationToken) {
      top = parent; parent = parent.parent; continue;
    }
    if (ts.isCallExpression(parent) && ts.isIdentifier(parent.expression) && parent.expression.text === 'Boolean') {
      top = parent; parent = parent.parent; continue;
    }
    if (ts.isBinaryExpression(parent)) {
      const op = parent.operatorToken.kind;
      if (
        op === ts.SyntaxKind.AmpersandAmpersandToken ||
        op === ts.SyntaxKind.BarBarToken ||
        op === ts.SyntaxKind.EqualsEqualsEqualsToken ||
        op === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
        op === ts.SyntaxKind.EqualsEqualsToken ||
        op === ts.SyntaxKind.ExclamationEqualsToken
      ) {
        top = parent; parent = parent.parent; continue;
      }
      break;
    }
    if (ts.isConditionalExpression(parent) && parent.condition === top) {
      top = parent; parent = parent.parent; continue; // include the whole ternary (branches)
    }
    break;
  }

  let ctx = top.getText(sf);
  const host = top.parent;
  if (host) {
    if (ts.isVariableDeclaration(host) && host.initializer === top && host.name) {
      ctx += ' ' + host.name.getText(sf);
    } else if (
      ts.isBinaryExpression(host) &&
      host.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      host.right === top
    ) {
      ctx += ' ' + host.left.getText(sf);
    } else if (ts.isPropertyAssignment(host) && host.initializer === top) {
      ctx += ' ' + host.name.getText(sf);
    } else if (ts.isReturnStatement(host)) {
      ctx += ' ' + enclosingFunctionName(node, sf);
    } else if (ts.isIfStatement(host) && host.expression === top) {
      ctx = host.getText(sf); // condition + then/else body
    }
  }
  return ctx;
}

export function evaluateFile(file, text) {
  const findings = [];
  const isTsx = /\.(tsx|jsx)$/.test(file);
  const sf = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const lineOf = (node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
  const snip = (node) => {
    try {
      return node.getText(sf).replace(/\s+/g, ' ').slice(0, 140);
    } catch {
      return '';
    }
  };
  const rawMsg =
    'raw CEC column read/select — route through the registry accessor ' +
    '(resolveLmsCourseCecHours/getApprovedCecHours); the raw `cecHours` column must not leave the accessor cluster.';
  const discMsg =
    'iicrcDiscipline used as a CEC/eligibility signal — eligibility must come from registry-approved ' +
    'hours (courseEligibleForIicrcCecSubmission), not discipline truthiness.';

  function push(node, msg) {
    findings.push(`  ${file}:${lineOf(node)}: ${msg}\n    → ${snip(node)}`);
  }

  function visit(node) {
    // 1. member read: X.cecHours
    if (ts.isPropertyAccessExpression(node) && node.name.text === RAW_FIELD) {
      push(node, rawMsg);
    }
    // 2. computed read: X['cecHours']
    else if (
      ts.isElementAccessExpression(node) &&
      node.argumentExpression &&
      ts.isStringLiteralLike(node.argumentExpression) &&
      node.argumentExpression.text === RAW_FIELD
    ) {
      push(node, rawMsg);
    }
    // 3. destructuring read (incl. aliased `{ cecHours: x }` and multiline): BindingElement
    //    whose source property is `cecHours`, inside an object binding pattern.
    else if (
      ts.isBindingElement(node) &&
      node.parent &&
      ts.isObjectBindingPattern(node.parent) &&
      (propName(node.propertyName) === RAW_FIELD ||
        (!node.propertyName && propName(node.name) === RAW_FIELD))
    ) {
      push(node, rawMsg);
    }
    // 3b. destructuring in an assignment pattern (object literal on the LHS): `({ cecHours } = x)`
    else if (
      ts.isShorthandPropertyAssignment(node) &&
      node.parent &&
      ts.isObjectLiteralExpression(node.parent) &&
      isAssignmentTarget(node.parent) &&
      node.name.text === RAW_FIELD
    ) {
      push(node, rawMsg);
    } else if (
      ts.isPropertyAssignment(node) &&
      node.parent &&
      ts.isObjectLiteralExpression(node.parent) &&
      isAssignmentTarget(node.parent) &&
      propName(node.name) === RAW_FIELD
    ) {
      push(node, rawMsg);
    }
    // 4. raw column SELECT: `cecHours: true` in a Prisma select/include object literal.
    else if (
      ts.isPropertyAssignment(node) &&
      propName(node.name) === RAW_FIELD &&
      node.initializer &&
      node.initializer.kind === ts.SyntaxKind.TrueKeyword &&
      !isAssignmentTarget(node.parent)
    ) {
      push(node, rawMsg + ' (Prisma select of the raw column enables a whole-record spread leak).');
    }

    // 5. iicrcDiscipline used as eligibility: a read of the discipline field in a boolean
    //    context whose enclosing statement is about CEC / eligibility / submission. JSX
    //    subtrees are excluded — `{course.iicrc_discipline && <Badge/>}` is conditional
    //    DISPLAY of the discipline, not an eligibility decision (the real leak lived in a
    //    plain eligibility function, not in a view).
    if (
      (ts.isPropertyAccessExpression(node) && DISCIPLINE_NAMES.has(node.name.text)) ||
      (ts.isElementAccessExpression(node) &&
        node.argumentExpression &&
        ts.isStringLiteralLike(node.argumentExpression) &&
        DISCIPLINE_NAMES.has(node.argumentExpression.text))
    ) {
      if (
        !isInsideJsx(node) &&
        inBooleanContext(node) &&
        CEC_PROXIMITY.test(decisionContextText(node, sf))
      ) {
        push(node, discMsg);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sf);
  return findings;
}

// Is `node` inside a JSX subtree (conditional display), not plain eligibility logic?
function isInsideJsx(node) {
  let p = node.parent;
  while (p) {
    if (
      ts.isJsxElement(p) ||
      ts.isJsxSelfClosingElement(p) ||
      ts.isJsxFragment(p) ||
      ts.isJsxExpression(p) ||
      ts.isJsxAttribute(p)
    ) {
      return true;
    }
    p = p.parent;
  }
  return false;
}

// Is this object literal the LHS target of a destructuring assignment (`({...} = x)`)?
function isAssignmentTarget(objLiteral) {
  let p = objLiteral.parent;
  while (p && ts.isParenthesizedExpression(p)) p = p.parent;
  return (
    p &&
    ts.isBinaryExpression(p) &&
    p.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
    (p.left === objLiteral || p.left === objLiteral.parent)
  );
}

export { inScope, isExempt, ACCESSOR_ALLOWLIST };

// Run the scanner only when invoked directly (not when imported by the self-test).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  let list = '';
  try {
    list = execSync('git ls-files', { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
  } catch (err) {
    console.error('check-cec-surfaces: failed to list tracked files:', err.message);
    process.exit(1);
  }
  const findings = [];
  for (const file of list
    .split('\n')
    .map((f) => f.trim())
    .filter((f) => f && CODE_EXT.test(f) && inScope(f) && !isExempt(f))) {
    let text = '';
    try {
      text = readFileSync(file, 'utf8');
    } catch (err) {
      // Fail LOUD — a file we cannot read is a blind spot, not a pass.
      console.error(`✖ CEC surface-leak guard — cannot read ${file}: ${err.message}`);
      process.exit(1);
    }
    findings.push(...evaluateFile(file, text));
  }

  if (findings.length > 0) {
    console.error(`\n✖ CEC surface-leak guard failed — ${findings.length} leaking surface(s)\n`);
    console.error('These read/select the raw course CEC column (or use iicrcDiscipline as eligibility)');
    console.error('and can render an un-approved CEC claim, bypassing the approvals registry. Route each');
    console.error('through the registry accessor (see scripts/check-cec-surfaces.mjs header):\n');
    console.error(findings.join('\n'));
    console.error(
      '\nThe resolved display DTO `cec_hours` / `resolvedCecHours` (gate output) is fine to read.\n' +
        'Verified false positive? Tighten the rule, never weaken the boundary.\n'
    );
    process.exit(1);
  }
  console.log('✓ CEC surface-leak guard passed — no raw CEC reads/selects outside the accessor cluster.');
  process.exit(0);
}
