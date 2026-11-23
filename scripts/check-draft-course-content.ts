#!/usr/bin/env tsx
/**
 * GP-740 — content checks for draft courses (data/courses/<slug>/v1-draft).
 *
 * Reads every draft's catalogue lessons, quiz and assessment files and markdown, and runs the
 * rules in src/lib/course-kit/draft-content-checks.ts: exposure-limit jurisdiction and dates,
 * workplace limits used as home levels, unsourced health claims, copied standard text.
 *
 * Reports how many courses, lessons and quiz questions it scanned. Exits 2 when it finds no
 * draft course at all, so an empty scan never reads as a pass.
 *
 * Usage: npx tsx scripts/check-draft-course-content.ts [--root <dir>] [--enforce] [--json]
 *   --enforce  exit 1 on any finding (default: report only, exit 0)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { htmlToText } from '../src/lib/course-kit/html-extract';
import {
  scanDraftBlocks,
  type DraftContentHit,
  type DraftTextBlock,
} from '../src/lib/course-kit/draft-content-checks';

export interface DraftScanResult {
  courses: number;
  lessons: number;
  quizQuestions: number;
  documents: number;
  hits: DraftContentHit[];
}

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

type Lesson = { id?: string; title?: string; contentBody?: string };
type Module = { title?: string; lessons?: Lesson[] };
type Course = { slug?: string; modules?: Module[] };
type Question = { questionText?: string; options?: string[]; explanation?: string };

function questionsOf(json: unknown): Question[] {
  const out: Question[] = [];
  const visit = (v: unknown) => {
    if (Array.isArray(v)) return v.forEach(visit);
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      if (typeof o.questionText === 'string') out.push(o as Question);
      else Object.values(o).forEach(visit);
    }
  };
  visit(json);
  return out;
}

export function scanDraftCourses(root = 'data/courses'): DraftScanResult {
  const result: DraftScanResult = {
    courses: 0,
    lessons: 0,
    quizQuestions: 0,
    documents: 0,
    hits: [],
  };
  let slugs: string[] = [];
  try {
    slugs = readdirSync(root).sort();
  } catch {
    return result;
  }
  const blocks: DraftTextBlock[] = [];
  for (const slug of slugs) {
    const dir = join(root, slug, 'v1-draft');
    if (!isDir(dir)) continue;
    result.courses++;
    for (const file of readdirSync(dir).sort()) {
      const path = join(dir, file);
      if (isDir(path)) continue;
      const ext = extname(file);
      if (ext === '.md') {
        result.documents++;
        // One block per paragraph: section references spread across a whole research pack
        // must not add up to a "pasted standard" signature that no single passage has.
        readFileSync(path, 'utf8')
          .split(/\n\s*\n/)
          .forEach((para, i) => {
            const text = para.replace(/\s+/g, ' ').trim();
            if (text)
              blocks.push({ where: `${path} › paragraph ${i + 1}`, kind: 'doc', text, raw: para });
          });
        continue;
      }
      if (ext !== '.json') continue;
      const json = JSON.parse(readFileSync(path, 'utf8')) as unknown;
      if (file === 'courses-catalog.json') {
        const list = (Array.isArray(json) ? json : (json as { courses?: Course[] }).courses) ?? [];
        for (const course of list as Course[]) {
          for (const mod of course.modules ?? []) {
            for (const lesson of mod.lessons ?? []) {
              result.lessons++;
              const raw = lesson.contentBody ?? '';
              blocks.push({
                where: `${path} › ${mod.title ?? '?'} › ${lesson.title ?? lesson.id ?? '?'}`,
                kind: 'lesson',
                text: htmlToText(raw),
                raw,
              });
            }
          }
        }
        continue;
      }
      questionsOf(json).forEach((q, i) => {
        result.quizQuestions++;
        const text = [q.questionText, ...(q.options ?? []), q.explanation]
          .filter(Boolean)
          .map((t) => htmlToText(String(t)))
          .join(' ');
        blocks.push({ where: `${path} › question ${i + 1}`, kind: 'quiz', text });
      });
    }
  }
  result.hits = scanDraftBlocks(blocks);
  return result;
}

function main(argv: string[]): number {
  const rootIdx = argv.indexOf('--root');
  const root = rootIdx >= 0 ? argv[rootIdx + 1] : 'data/courses';
  const enforce = argv.includes('--enforce');
  const r = scanDraftCourses(root);
  if (argv.includes('--json')) {
    console.log(JSON.stringify(r, null, 2));
  } else {
    console.log(
      `Draft course content check (GP-740): scanned ${r.courses} draft course(s), ${r.lessons} lesson(s), ` +
        `${r.quizQuestions} quiz question(s), ${r.documents} document(s).`
    );
    for (const h of r.hits) {
      console.log(`\n[${h.rule}] ${h.where}\n  ${h.message}\n  > ${h.sample}`);
    }
    console.log(
      `\n${r.hits.length} finding(s).${enforce ? '' : ' Report only; pass --enforce to fail.'}`
    );
  }
  if (r.courses === 0 || r.lessons + r.quizQuestions === 0) {
    console.error(`No draft course content found under ${root}; refusing to report a pass.`);
    return 2;
  }
  return enforce && r.hits.length > 0 ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
