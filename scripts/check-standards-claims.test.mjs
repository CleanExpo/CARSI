#!/usr/bin/env node
/**
 * Proof the standards-claim guard catches the 2026-07-15 incident AND every
 * evasion the adversarial review raised, while leaving legitimate copy alone.
 */
import { evaluate } from './check-standards-claims.mjs';

const MUST_BLOCK = [
  ['incident gimmick', 'Search the IICRC S520 for the word "hydroxyl."'],
  ['absence claim', 'S520 does not mention ozone or hydroxyl.'],
  ['absence — silent on', 'The standard is silent on hydroxyl generators.'],
  ['adversary #1 positive fabrication', 'S520 mandates hydroxyl generators as the primary antimicrobial control.'],
  ['adversary #2 fabricated section', 'Under S520 §14.2, ozone fogging is prohibited in occupied structures.'],
  ['adversary #3a out-of-scope', 'S520 treats ozone as out of scope.'],
  ['adversary #3b false positive count', 'S520 references ozone only twice, both as cautions.'],
  ['uncited requirement claim', 'The standard requires ozone fogging after every mould job.'],
  ['CodeRabbit: unnamed-standard cited §99', 'The standard §99 requires ozone fogging in every occupied structure.'],
  ['CodeRabbit: unsupported standard S540 §14', 'S540 §14 requires hydroxyl generators as the primary control.'],
];

const MUST_PASS = [
  ['corrected true claim (cited, valid section)', 'S520 §9.1.7 addresses ozone and other antimicrobial devices as supplementary tools.'],
  ['legit nominative, no content claim', 'Our courses are aligned to ANSI/IICRC S500:2021.'],
  ['legit cited content claim', 'Worker protection is covered in S520 §5, Safety and Health.'],
  ['CodeRabbit: leading-zero §09 normalises to valid §9', 'S520 §09 requires structural remediation to begin with containment.'],
  ['legit nominative + soft verb (no false positive)', 'Aligned to ANSI/IICRC S500:2021 and covering the full water-damage workflow.'],
  ['unrelated copy', 'Mould remediation begins with a moisture inspection.'],
];

let fail = 0;
for (const [name, text] of MUST_BLOCK) {
  const hits = evaluate(text);
  const ok = hits.length > 0;
  console.log(`${ok ? '✓ BLOCKED' : '✗ LEAKED '} | ${name}`);
  if (!ok) { console.log(`           → "${text}"`); fail++; }
}
for (const [name, text] of MUST_PASS) {
  const hits = evaluate(text);
  const ok = hits.length === 0;
  console.log(`${ok ? '✓ PASSED ' : '✗ FALSE+ '} | ${name}`);
  if (!ok) { console.log(`           → "${text}" :: ${hits[0]}`); fail++; }
}
console.log(fail === 0 ? '\n✓ all cases correct' : `\n✗ ${fail} case(s) wrong`);
process.exit(fail === 0 ? 0 : 1);
