import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('quiz question explanation schema', () => {
  it('adds a nullable explanation to LmsQuizQuestion', () => {
    const schema = readFileSync(path.join(root, 'prisma/schema.prisma'), 'utf8');
    const model = schema.slice(schema.indexOf('model LmsQuizQuestion {'));
    const body = model.slice(0, model.indexOf('\n}'));
    expect(body).toMatch(/^\s+explanation\s+String\?\s+@db\.Text$/m);
  });

  it('ships exactly one additive, nullable migration for it', () => {
    const dir = path.join(root, 'prisma/migrations');
    const hits = readdirSync(dir)
      .filter((d) => !d.endsWith('.toml'))
      .map((d) => readFileSync(path.join(dir, d, 'migration.sql'), 'utf8'))
      .filter((sql) => /lms_quiz_questions/.test(sql) && /explanation/.test(sql));
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatch(/ALTER TABLE "lms_quiz_questions" ADD COLUMN "explanation" TEXT;/);
    expect(hits[0]).not.toMatch(/NOT NULL|DROP|DEFAULT/i);
  });

  it('keeps explanations out of the version-bound quiz graph', () => {
    // The lesson content version is an HMAC over that graph; adding the explanation there would
    // mark every learner's in-progress quiz stale on deploy.
    const checkpoint = readFileSync(path.join(root, 'src/lib/server/lesson-checkpoint.ts'), 'utf8');
    expect(checkpoint).not.toMatch(/explanation/);
  });
});
