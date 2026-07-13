import { describe, expect, it } from 'vitest';

import {
  buildAudioScriptScaffold,
  buildFlashcardsScaffold,
  buildImageBriefsScaffold,
  buildQuizScaffold,
  buildSlidesScaffold,
  scanCourseForBannedPhrases,
} from './scaffold';
import { SCAFFOLD_STATUS, type KitCourse } from './types';

const COURSE: KitCourse = {
  slug: 'demo-course',
  title: 'Demo Course',
  cecHours: 0,
  modules: [
    {
      title: 'Module 1: Reporting',
      lessons: [
        {
          id: 'lesson-1',
          title: 'Reporting — Reading',
          contentBody:
            '<h2>Report first</h2><p>Australia reported detections.</p>' +
            '<ol><li>Do not touch it.</li><li>Report on 1800 675 888.</li></ol>' +
            '<blockquote>Report first. Call the hotline.</blockquote>',
        },
      ],
    },
    {
      title: 'Module 2: Scope',
      lessons: [
        {
          id: 'lesson-2',
          title: 'Scope — Reading',
          contentBody: '<p>Support, not authority replacement. Document what you do.</p>',
        },
      ],
    },
  ],
};

describe('buildFlashcardsScaffold', () => {
  it('makes one deck per module and a card per key statement (back extractive, front empty)', () => {
    const out = buildFlashcardsScaffold(COURSE);
    expect(out.status).toBe(SCAFFOLD_STATUS);
    expect(out.courseSlug).toBe('demo-course');
    expect(out.decks).toHaveLength(2);
    const deck1 = out.decks[0];
    expect(deck1.module).toBe('Module 1: Reporting');
    expect(deck1.cards).toEqual([
      { front: '', back: 'Do not touch it.', sourceLessonId: 'lesson-1' },
      { front: '', back: 'Report on 1800 675 888.', sourceLessonId: 'lesson-1' },
      { front: '', back: 'Report first. Call the hotline.', sourceLessonId: 'lesson-1' },
    ]);
  });
  it('never invents a card front', () => {
    const out = buildFlashcardsScaffold(COURSE);
    for (const deck of out.decks) {
      for (const card of deck.cards) expect(card.front).toBe('');
    }
  });
});

describe('buildSlidesScaffold', () => {
  it('titles from heading, bullets from list items, speakerNotes empty', () => {
    const out = buildSlidesScaffold(COURSE);
    const slide = out.decks[0].slides[0];
    expect(slide.title).toBe('Report first');
    expect(slide.bullets).toEqual(['Do not touch it.', 'Report on 1800 675 888.']);
    expect(slide.speakerNotes).toBe('');
    expect(slide.sourceLessonId).toBe('lesson-1');
  });
  it('falls back to the lesson title when the lesson has no headings', () => {
    const out = buildSlidesScaffold(COURSE);
    expect(out.decks[1].slides[0].title).toBe('Scope — Reading');
  });
});

describe('buildAudioScriptScaffold', () => {
  it('one segment per module, extractive topicPrompt, empty text', () => {
    const out = buildAudioScriptScaffold(COURSE);
    expect(out.segments).toHaveLength(2);
    expect(out.segments[0].topicPrompt).toBe('Module 1: Reporting — Reporting — Reading');
    expect(out.segments[0].text).toBe('');
  });
});

describe('buildQuizScaffold', () => {
  it('one placeholder question per lesson tagged with sourceLessonId, no answers invented', () => {
    const out = buildQuizScaffold(COURSE);
    const questions = out.quizzes[0].questions;
    expect(questions.map((q) => q.sourceLessonId)).toEqual(['lesson-1', 'lesson-2']);
    for (const q of questions) {
      expect(q.questionText).toBe('');
      expect(q.options).toEqual([]);
      expect(q.correctIndex).toBeNull();
    }
  });
});

describe('buildImageBriefsScaffold', () => {
  it('one brief per lesson with extractive context, prefilled style, empty prompt', () => {
    const out = buildImageBriefsScaffold(COURSE);
    expect(out.briefs).toHaveLength(2);
    expect(out.briefs[0].context).toContain('Australia reported detections');
    expect(out.briefs[0].style).toMatch(/Australian/);
    expect(out.briefs[0].prompt).toBe('');
  });
});

describe('scanCourseForBannedPhrases', () => {
  it('returns no hits for compliant content', () => {
    expect(scanCourseForBannedPhrases(COURSE)).toEqual([]);
  });
  it('flags a banned IICRC phrasing in delivered content, located by lesson', () => {
    const bad: KitCourse = {
      slug: 'bad',
      title: 'Bad',
      cecHours: 0,
      modules: [
        {
          title: 'M',
          lessons: [
            { id: 'lx', title: 'Lx', contentBody: '<p>Get IICRC certified with CARSI today.</p>' },
          ],
        },
      ],
    };
    const hits = scanCourseForBannedPhrases(bad);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].where).toContain('lx');
  });
});
