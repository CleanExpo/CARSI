import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDraftCopy, draftFolders, draftCopyFiles } from './course-drafts.mjs';

test('draft catalogue JSON and markdown are course copy', () => {
  assert.equal(isDraftCopy('data/courses/mould/v1-draft/course.json'), true);
  assert.equal(isDraftCopy('data/courses/mould/v1-draft/field-tools/checklist.md'), true);
  assert.equal(isDraftCopy('data\\courses\\mould\\v1-draft\\a.md'), true);
});

test('evidence, other file types and non-draft folders are not', () => {
  assert.equal(isDraftCopy('data/courses/mould/v1-draft/evidence/evidence-ledger.jsonl'), false);
  assert.equal(isDraftCopy('data/courses/mould/v1-draft/evidence/notes.md'), false);
  assert.equal(isDraftCopy('data/courses/mould/v1-draft/diagram.svg'), false);
  assert.equal(isDraftCopy('data/courses/whs/evidence/evidence-ledger.jsonl'), false);
  assert.equal(isDraftCopy('data/courses/mould/v2-draft/course.json'), false);
  assert.equal(isDraftCopy('data/seed/courses-catalog.json'), false);
});

test('folders are counted once and a folder with no copy is reported', () => {
  const paths = [
    'data/courses/a/v1-draft/course.json',
    'data/courses/a/v1-draft/research-pack.md',
    'data/courses/b/v1-draft/evidence/evidence-ledger.jsonl',
    'data/courses/c/evidence/evidence-ledger.jsonl',
  ];
  assert.deepEqual(draftFolders(paths), ['data/courses/a/v1-draft', 'data/courses/b/v1-draft']);
  const r = draftCopyFiles(paths);
  assert.deepEqual(r.files, ['data/courses/a/v1-draft/course.json', 'data/courses/a/v1-draft/research-pack.md']);
  assert.deepEqual(r.empty, ['data/courses/b/v1-draft']);
});
