import { describe, it, expect } from 'vitest';

import {
  isVideoBriefComplete,
  isVideoBriefsFile,
  type CourseLessonVideoBrief,
  type LessonVideoResource,
} from './course-lesson-video-briefs-types';
import { buildSrt, formatSrtTime, mergeVideoResource } from './lesson-video-helpers';

describe('formatSrtTime', () => {
  it('formats zero as HH:MM:SS,mmm', () => {
    expect(formatSrtTime(0)).toBe('00:00:00,000');
  });

  it('formats hours, minutes, seconds and milliseconds', () => {
    expect(formatSrtTime(3661.5)).toBe('01:01:01,500');
    expect(formatSrtTime(75.25)).toBe('00:01:15,250');
  });

  it('clamps negative / non-finite input to zero', () => {
    expect(formatSrtTime(-5)).toBe('00:00:00,000');
    expect(formatSrtTime(Number.NaN)).toBe('00:00:00,000');
  });
});

describe('buildSrt', () => {
  it('produces one numbered cue per sentence, starting at zero', () => {
    const srt = buildSrt('First sentence here. Second one follows! And a third?');
    const blocks = srt.trim().split('\n\n');
    expect(blocks).toHaveLength(3);
    expect(blocks[0].startsWith('1\n00:00:00,000 --> ')).toBe(true);
    expect(blocks[1].startsWith('2\n')).toBe(true);
    expect(blocks[2].startsWith('3\n')).toBe(true);
  });

  it('advances cue timings monotonically', () => {
    const srt = buildSrt('Alpha sentence. Bravo sentence. Charlie sentence.');
    const starts = [...srt.matchAll(/(\d\d:\d\d:\d\d,\d\d\d) --> /g)].map((m) => m[1]);
    expect(starts).toHaveLength(3);
    expect(starts[0]).toBe('00:00:00,000');
    expect(starts[1] > starts[0]).toBe(true);
    expect(starts[2] > starts[1]).toBe(true);
  });

  it('treats a script with no sentence punctuation as a single cue', () => {
    const srt = buildSrt('a short caption with no full stop');
    expect(srt.trim().split('\n\n')).toHaveLength(1);
    expect(srt).toContain('a short caption with no full stop');
  });
});

describe('mergeVideoResource', () => {
  const en: LessonVideoResource = { label: 'Lesson video', url: 'https://x/en.mp4', kind: 'video', language: 'en-AU' };

  it('adds the resource when there are no existing resources', () => {
    expect(mergeVideoResource(null, en)).toEqual([en]);
    expect(mergeVideoResource([], en)).toEqual([en]);
  });

  it('keeps non-video resources and appends the video', () => {
    const audio = { label: 'Lesson narration (audio)', url: 'https://x/a.mp3', kind: 'audio' };
    const out = mergeVideoResource([audio], en);
    expect(out).toContainEqual(audio);
    expect(out).toContainEqual(en);
    expect(out).toHaveLength(2);
  });

  it('replaces an existing video of the SAME language', () => {
    const older: LessonVideoResource = { label: 'Lesson video', url: 'https://x/old.mp4', kind: 'video', language: 'en-AU' };
    const out = mergeVideoResource([older], en);
    expect(out).toHaveLength(1);
    expect(out[0].url).toBe('https://x/en.mp4');
  });

  it('keeps a video of a DIFFERENT language', () => {
    const fr: LessonVideoResource = { label: 'Lesson video', url: 'https://x/fr.mp4', kind: 'video', language: 'fr-FR' };
    const out = mergeVideoResource([fr], en);
    expect(out).toHaveLength(2);
    expect(out.map((r) => r.language).sort()).toEqual(['en-AU', 'fr-FR']);
  });

  it('treats a video with no language as en-AU for replacement', () => {
    const noLang = { label: 'Lesson video', url: 'https://x/legacy.mp4', kind: 'video' } as LessonVideoResource;
    const out = mergeVideoResource([noLang], en);
    expect(out).toHaveLength(1);
    expect(out[0].url).toBe('https://x/en.mp4');
  });
});

describe('video briefs validation', () => {
  const brief: CourseLessonVideoBrief = {
    courseSlug: 'demo',
    lessonId: 'abc',
    lessonTitle: 'Lesson',
    title: 'Lesson',
    script: 'Some narration.',
    format: 'lesson-intro',
    durationSeconds: 60,
    avatarId: null,
    voiceId: null,
    locale: 'en-AU',
    captions: true,
  };

  it('accepts a well-formed briefs file', () => {
    expect(isVideoBriefsFile({ version: 1, generatedAt: 't', briefs: [brief] })).toBe(true);
  });

  it('rejects a wrong version or non-array briefs', () => {
    expect(isVideoBriefsFile({ version: 2, generatedAt: 't', briefs: [brief] })).toBe(false);
    expect(isVideoBriefsFile({ version: 1, generatedAt: 't', briefs: {} })).toBe(false);
  });

  it('rejects a brief missing a required field', () => {
    const { courseSlug, ...rest } = brief;
    void courseSlug;
    expect(isVideoBriefsFile({ version: 1, generatedAt: 't', briefs: [rest] })).toBe(false);
  });

  it('gates completeness on a non-empty script', () => {
    expect(isVideoBriefComplete(brief)).toBe(true);
    expect(isVideoBriefComplete({ ...brief, script: '   ' })).toBe(false);
  });
});
