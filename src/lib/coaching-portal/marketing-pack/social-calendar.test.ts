import { describe, expect, it } from 'vitest';

import { findComplianceIssues } from './compliance';
import {
  assembleCalendar,
  buildCalendarMessages,
  buildFallbackPosts,
  parseCalendarResponse,
} from './social-calendar';

const voice = {
  businessName: 'Downs Carpet Care',
  trade: 'Carpet & upholstery',
  town: 'Toowoomba',
  services: 'Carpet cleaning, rug cleaning, upholstery',
};

describe('social calendar', () => {
  it('builds a prompt that carries the trade voice inputs and the claim rules', () => {
    const messages = buildCalendarMessages(voice);
    const all = messages.map((m) => m.content).join('\n');
    expect(all).toContain('Carpet & upholstery');
    expect(all).toContain('Toowoomba');
    expect(all).toContain('Downs Carpet Care');
    expect(all).toContain('rug cleaning');
    expect(all).toMatch(/no earnings/i);
    expect(all).toMatch(/guarantee/i);
    expect(all).toMatch(/Australian English/);
  });

  it('parses a JSON array out of a fenced model reply and drops malformed rows', () => {
    const reply =
      'Here you go:\n```json\n[{"day":1,"theme":"Intro","caption":"Hello Toowoomba, we are Downs Carpet Care.","hashtags":["#Toowoomba"]},{"day":"x"},{"caption":""}]\n```';
    const posts = parseCalendarResponse(reply);
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({ theme: 'Intro', hashtags: ['#Toowoomba'] });
  });

  it('returns an empty list for a reply with no JSON', () => {
    expect(parseCalendarResponse('Sorry, I cannot help.')).toEqual([]);
  });

  it('always yields exactly 30 dated items in the trade voice, even with no AI output', () => {
    const calendar = assembleCalendar([], voice, new Date('2026-11-09T00:00:00Z'));
    expect(calendar.posts).toHaveLength(30);
    expect(calendar.posts.map((p) => p.day)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    expect(calendar.posts[0].date).toBe('2026-11-09');
    expect(calendar.posts[29].date).toBe('2026-12-08');
    expect(calendar.source).toBe('template');
    const text = calendar.posts.map((p) => p.caption).join('\n');
    expect(text).toContain('Toowoomba');
    expect(text.toLowerCase()).toContain('carpet');
  });

  it('every template post passes the compliance filter', () => {
    for (const post of buildFallbackPosts(voice)) {
      expect(findComplianceIssues(`${post.theme} ${post.caption}`)).toEqual([]);
    }
  });

  it('drops AI posts that make earnings or guarantee claims and back-fills to 30', () => {
    const ai = Array.from({ length: 30 }, (_, i) => ({
      theme: `Tip ${i + 1}`,
      caption:
        i % 3 === 0
          ? 'Guaranteed spotless carpets or your money back!'
          : i % 3 === 1
            ? 'Our customers save $500 a year, earn more from their rentals.'
            : `Toowoomba tip ${i + 1}: vacuum high-traffic areas twice a week.`,
      hashtags: ['#Toowoomba'],
    }));
    const calendar = assembleCalendar(ai, voice, new Date('2026-11-09T00:00:00Z'));
    expect(calendar.posts).toHaveLength(30);
    expect(calendar.rejectedCount).toBe(20);
    expect(calendar.source).toBe('ai+template');
    for (const post of calendar.posts) {
      expect(findComplianceIssues(`${post.theme} ${post.caption}`)).toEqual([]);
    }
  });

  it('drops an every-visit result promise from the calendar (Codex P1, head 95f39114)', () => {
    const promise = 'Our service gets your carpets spotless every visit.';
    const ai = Array.from({ length: 30 }, (_, i) => ({
      theme: `Tip ${i + 1}`,
      caption: i === 0 ? promise : `Toowoomba tip ${i + 1}: blot spills, never rub them.`,
      hashtags: [],
    }));
    const calendar = assembleCalendar(ai, voice, new Date('2026-11-09T00:00:00Z'));
    expect(calendar.posts).toHaveLength(30);
    expect(calendar.rejectedCount).toBe(1);
    expect(calendar.posts.map((p) => p.caption)).not.toContain(promise);
  });

  it('uses AI posts only (source ai) when all 30 pass', () => {
    const ai = Array.from({ length: 34 }, (_, i) => ({
      theme: `Tip ${i + 1}`,
      caption: `Toowoomba tip ${i + 1}: blot spills, never rub them.`,
      hashtags: [],
    }));
    const calendar = assembleCalendar(ai, voice, new Date('2026-11-09T00:00:00Z'));
    expect(calendar.posts).toHaveLength(30);
    expect(calendar.source).toBe('ai');
  });
});
