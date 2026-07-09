import { describe, expect, it } from 'vitest';

import { extractQuizIdFromLesson } from './quiz-from-lesson';
import {
  isFlashcardResource,
  isSlidesResource,
  parseLessonResources,
} from './lesson-resources';

describe('parseLessonResources', () => {
  it('keeps plain link resources exactly as before', () => {
    expect(
      parseLessonResources([
        { label: 'Course workbook', url: 'https://example.com/workbook.pdf' },
        { url: 'https://example.com/unlabelled.pdf' },
      ])
    ).toEqual([
      { label: 'Course workbook', url: 'https://example.com/workbook.pdf' },
      { label: 'Resource', url: 'https://example.com/unlabelled.pdf' },
    ]);
  });

  it('passes flashcards resources through with kind and cards intact', () => {
    const out = parseLessonResources([
      {
        kind: 'flashcards',
        label: 'Study flashcards',
        cards: [{ front: 'Front text', back: 'Back text' }],
      },
    ]);
    expect(out).toEqual([
      {
        kind: 'flashcards',
        label: 'Study flashcards',
        cards: [{ front: 'Front text', back: 'Back text' }],
      },
    ]);
    expect(out.filter(isFlashcardResource)).toHaveLength(1);
  });

  it('defaults the flashcards label and drops malformed cards', () => {
    expect(
      parseLessonResources([
        {
          kind: 'flashcards',
          cards: [
            { front: 'Kept', back: 'Kept too' },
            { front: 'No back' },
            { front: '', back: 'Blank front' },
            'not an object',
          ],
        },
      ])
    ).toEqual([
      {
        kind: 'flashcards',
        label: 'Study flashcards',
        cards: [{ front: 'Kept', back: 'Kept too' }],
      },
    ]);
  });

  it('drops flashcards resources with no usable cards and non-array input', () => {
    expect(parseLessonResources([{ kind: 'flashcards', cards: [] }])).toEqual([]);
    expect(parseLessonResources([{ kind: 'flashcards' }])).toEqual([]);
    expect(parseLessonResources(null)).toEqual([]);
    expect(parseLessonResources('nope')).toEqual([]);
  });

  it('passes slides resources through with kind and decks intact', () => {
    const out = parseLessonResources([
      {
        kind: 'slides',
        label: 'Lesson slides',
        decks: [
          {
            module: 'Official message and reporting pathway',
            slides: [
              {
                title: 'The official position',
                bullets: ['Follow Australian Government advice.'],
                speakerNotes: 'Stay calm and evidence-led.',
              },
            ],
          },
        ],
      },
    ]);
    expect(out).toEqual([
      {
        kind: 'slides',
        label: 'Lesson slides',
        decks: [
          {
            module: 'Official message and reporting pathway',
            slides: [
              {
                title: 'The official position',
                bullets: ['Follow Australian Government advice.'],
                speakerNotes: 'Stay calm and evidence-led.',
              },
            ],
          },
        ],
      },
    ]);
    expect(out.filter(isSlidesResource)).toHaveLength(1);
  });

  it('defaults the slides label, module name, bullets and speaker notes', () => {
    expect(
      parseLessonResources([
        {
          kind: 'slides',
          decks: [
            {
              slides: [{ title: 'Kept' }],
            },
          ],
        },
      ])
    ).toEqual([
      {
        kind: 'slides',
        label: 'Lesson slides',
        decks: [
          {
            module: 'Slides',
            slides: [{ title: 'Kept', bullets: [], speakerNotes: '' }],
          },
        ],
      },
    ]);
  });

  it('drops malformed slides, empty decks and slides resources with no usable decks', () => {
    expect(
      parseLessonResources([
        {
          kind: 'slides',
          decks: [
            {
              module: 'Mixed deck',
              slides: [
                { title: 'Kept', bullets: ['Real bullet', 42, ''], speakerNotes: 'Notes' },
                { title: '' },
                { bullets: ['No title'] },
                'not an object',
              ],
            },
            { module: 'Empty deck', slides: [] },
            'not a deck',
          ],
        },
        { kind: 'slides', decks: [] },
        { kind: 'slides' },
      ])
    ).toEqual([
      {
        kind: 'slides',
        label: 'Lesson slides',
        decks: [
          {
            module: 'Mixed deck',
            slides: [{ title: 'Kept', bullets: ['Real bullet'], speakerNotes: 'Notes' }],
          },
        ],
      },
    ]);
  });

  it('does not break quiz extraction from resources', () => {
    const resources = parseLessonResources([
      { kind: 'flashcards', cards: [{ front: 'F', back: 'B' }] },
      {
        kind: 'slides',
        decks: [{ module: 'M', slides: [{ title: 'T', bullets: [], speakerNotes: '' }] }],
      },
      { label: 'Quiz', url: 'quiz:123e4567-e89b-42d3-a456-426614174000' },
    ]);
    expect(extractQuizIdFromLesson('text', null, resources)).toBe(
      '123e4567-e89b-42d3-a456-426614174000'
    );
  });
});
