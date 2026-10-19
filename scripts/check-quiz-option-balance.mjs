#!/usr/bin/env node
/**
 * check-quiz-option-balance.mjs — quiz options must not give the answer away by their shape.
 *
 * Rule (teach method, founder directive 19/10/2026): every option in a question has the SAME
 * number of words, and close to the same number of characters, so a learner cannot pick the
 * longest or most qualified option and be right. Also flags a correct answer that sits in the
 * same position for every question in a quiz.
 *
 * Scans every data/seed/*-quiz.json and *.quizzes.json file. Advisory by default (exit 0, like
 * check-course-completeness) because older quizzes predate the rule. Pass
 * --enforce=<courseSlug,...|all> to exit 1 when a quiz for those courses breaks the rule.
 *
 * Usage: node scripts/check-quiz-option-balance.mjs [--enforce=<slugs|all>] [--json]
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const SEED_DIR = 'data/seed';
/** Characters may differ by at most this share of the longest option, or by MIN_CHAR_SLACK. */
export const CHAR_TOLERANCE = 0.4;
export const MIN_CHAR_SLACK = 8;

/** Visible text of an option: tags stripped, entities collapsed to one character. */
export function visibleText(s) {
  return String(s)
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;|&#\d+;/gi, 'x')
    .replace(/\s+/g, ' ')
    .trim();
}

export const wordCount = (s) => (visibleText(s) ? visibleText(s).split(' ').length : 0);

/** Problems with one question's options: [] when balanced. */
export function questionProblems(options) {
  const out = [];
  if (!Array.isArray(options) || options.length < 2) return ['fewer than 2 options'];
  const words = options.map(wordCount);
  if (new Set(words).size !== 1) out.push(`word counts differ: ${words.join('/')}`);
  const chars = options.map((o) => visibleText(o).length);
  const max = Math.max(...chars);
  const min = Math.min(...chars);
  if (max - min > Math.max(MIN_CHAR_SLACK, Math.ceil(max * CHAR_TOLERANCE))) {
    out.push(`character lengths differ too much: ${chars.join('/')}`);
  }
  return out;
}

/** Problems with one quiz: per-question shape plus a constant answer position. */
export function quizProblems(quiz) {
  const out = [];
  const qs = quiz.questions || [];
  qs.forEach((q, i) => {
    for (const p of questionProblems(q.options)) out.push(`Q${i + 1}: ${p}`);
  });
  if (qs.length >= 4 && new Set(qs.map((q) => q.correctIndex)).size === 1) {
    out.push(`every correct answer is option ${qs[0].correctIndex}`);
  }
  return out;
}

function loadQuizFiles(dir = SEED_DIR) {
  const files = readdirSync(dir).filter((f) => f.endsWith('-quiz.json') || f.endsWith('.quizzes.json'));
  const out = [];
  for (const f of files) {
    let data;
    try {
      data = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    } catch {
      continue;
    }
    const slug = data.courseSlug || f.replace(/(-quiz|\.quizzes)\.json$/, '');
    for (const quiz of data.quizzes || []) out.push({ file: f, slug, quiz });
  }
  return out;
}

const isCli = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  const args = process.argv.slice(2);
  const enforceArg = (args.find((a) => a.startsWith('--enforce=')) || '').slice('--enforce='.length);
  const enforceAll = enforceArg === 'all';
  const enforceSet = new Set(enforceArg.split(',').map((s) => s.trim()).filter(Boolean));
  const quizzes = loadQuizFiles();
  if (quizzes.length === 0) {
    console.error('check-quiz-option-balance: scanned 0 quizzes — refusing to report a pass.');
    process.exit(2);
  }
  const known = new Set(quizzes.map((q) => q.slug));
  const missing = enforceAll ? [] : [...enforceSet].filter((s) => !known.has(s));
  if (missing.length) {
    console.error(`check-quiz-option-balance: no quiz found for enforced slug(s): ${missing.join(', ')}`);
    process.exit(2);
  }
  let failing = 0;
  const report = [];
  for (const { file, slug, quiz } of quizzes) {
    const problems = quizProblems(quiz);
    const enforced = enforceAll || enforceSet.has(slug);
    if (problems.length && enforced) failing += 1;
    report.push({ file, slug, quiz: quiz.title, enforced, problems });
  }
  if (args.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    for (const r of report) {
      const tag = r.problems.length ? (r.enforced ? 'FAIL' : 'advisory') : 'ok';
      console.log(`${tag.padEnd(8)} ${r.file} (${r.problems.length} problem${r.problems.length === 1 ? '' : 's'})`);
      if (r.enforced) for (const p of r.problems) console.log(`         - ${p}`);
    }
    console.log(`scanned ${report.length} quizzes; ${failing} enforced quiz(zes) failing`);
  }
  process.exit(failing ? 1 : 0);
}
