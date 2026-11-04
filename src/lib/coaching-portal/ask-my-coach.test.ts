import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  ASK_COACH_COPY,
  ASK_COACH_EVERYDAY_WORDS,
  answerFromKnowledgeBase,
  askCoachGoalId,
  isAskCoachGoalId,
  isComplianceSensitiveQuestion,
  normaliseQuestion,
  type CoachKnowledgeBase,
} from '@/lib/coaching-portal/ask-my-coach';
import { DEFAULT_COACHING_COACH } from '@/lib/coaching-portal/coach-routing';
import {
  CARSI_PUBLISHED_KNOWLEDGE_SOURCE,
  DEFAULT_COACH_KNOWLEDGE_SOURCES,
  getCoachKnowledgeBase,
  type CoachKnowledgeSource,
} from '@/lib/coaching-portal/coach-knowledge-base';
import { COACHING_RESOURCE_SECTIONS } from '@/lib/coaching-portal/coaching-resources';
import { carsiCoachingMonthlyInclusions } from '@/lib/marketing/carsi-coaching-program';

import { evaluateContent as complianceFindings } from '../../../scripts/check-iicrc-compliance.mjs';

const KB: CoachKnowledgeBase = {
  coachId: 'coach-a',
  items: [
    {
      id: 'gbp',
      title: 'Google Business Profile & local search',
      body: 'Categories, service areas, photos, posts, and reviews, structured so you show up when locals search.',
      sourceLabel: 'Coaching programme',
      sourceHref: '/ccw-training',
    },
    {
      id: 'quoting',
      title: 'Quoting & job costing rhythm',
      body: 'Templates and habits so you stop undercharging good work and over-investing in gear before the phone rings.',
      sourceLabel: 'Coaching programme',
      sourceHref: '/ccw-training',
    },
  ],
};

describe('answerFromKnowledgeBase (a): answers cite only knowledge-base items', () => {
  it('answers a question the coach material covers, citing that item', () => {
    const r = answerFromKnowledgeBase(
      'How should I set up my Google Business Profile photos and reviews?',
      KB
    );
    expect(r.status).toBe('answered');
    if (r.status !== 'answered') return;
    expect(r.citations.map((c) => c.itemId)).toContain('gbp');
    // Every citation resolves to an item in THIS knowledge base, with its source shown.
    const ids = new Set(KB.items.map((i) => i.id));
    for (const c of r.citations) {
      expect(ids.has(c.itemId)).toBe(true);
      expect(c.sourceHref).toBeTruthy();
      expect(c.sourceLabel).toBeTruthy();
    }
    // The answer text is the coach's own words, not generated prose.
    for (const p of r.passages) {
      const item = KB.items.find((i) => i.id === p.itemId);
      expect(item?.body).toBe(p.text);
    }
  });

  it('never returns an answer without at least one citation', () => {
    for (const q of [
      'How do I stop undercharging on quotes?',
      'Google Business Profile reviews',
      'photos',
      'What should I charge for a truck mount hire?',
    ]) {
      const r = answerFromKnowledgeBase(q, KB);
      if (r.status === 'answered') expect(r.citations.length).toBeGreaterThan(0);
    }
  });
});

describe('answerFromKnowledgeBase (b): ungrounded questions are not answered', () => {
  it('escalates a question with no grounded source', () => {
    const r = answerFromKnowledgeBase('Which van should I buy for my second crew in Perth?', KB);
    expect(r).toEqual({ status: 'needs_coach', reason: 'no_grounded_source' });
  });

  it('escalates when only one weak word overlaps', () => {
    const r = answerFromKnowledgeBase(
      'Should I hire a second technician for my photos business?',
      KB
    );
    expect(r.status).toBe('needs_coach');
  });

  it('escalates an empty knowledge base', () => {
    const r = answerFromKnowledgeBase('How do I get more Google reviews?', {
      coachId: 'x',
      items: [],
    });
    expect(r.status).toBe('needs_coach');
  });
});

describe('compliance (d)', () => {
  it('routes any IICRC, CEC, certification or accreditation question to the coach', () => {
    for (const q of [
      'Does this coaching earn IICRC CECs?',
      'Is CARSI accredited to certify me?',
      'Will I get certified after the program?',
      'Is the Google Business Profile course CEC approved?',
      // Shorthand and near-synonyms (Codex r1 P1: 'cert' slipped through).
      'Can my Google Business Profile reviews earn me a cert?',
      'Do I get certs for the Google Business Profile work?',
      'What qualification do I hold after the Google Business Profile module?',
      'Does the Google Business Profile module give me a designation or credential?',
      // Codex r2 P1: prefixes, typos and punctuation must not slip past either.
      'What recertification options do I have for Google Business Profile reviews?',
      'Can I recert using the Google Business Profile module?',
      'Do I need to re-certify after the Google Business Profile work?',
      'Is there a certfication for Google Business Profile reviews?',
      'Do the Google Business Profile reviews count toward my CEC’s?',
      'Is the Google Business Profile module accredidted?',
      'Is the Google Business Profile module approved by anyone?',
      'Does the Google Business Profile module count as continuing-education?',
      'Will the Google Business Profile module help me get licenced?',
      // Codex r3 P1: punctuated, spaced and misspelt forms.
      'Do Google Business Profile reviews earn C.E.C. credits?',
      'Do Google Business Profile reviews earn C E C points?',
      'Do Google Business Profile reviews earn c-e-c hours?',
      'Is there a cerification for Google Business Profile reviews?',
      'Is the Google Business Profile module acreditation ready?',
      'Do Google Business Profile reviews give me a qualifcation?',
      'Is the Google Business Profile module I.I.C.R.C. recognised?',
      // Codex r4 P1: continuing professional development.
      'Can I use the Google Business Profile module for my CPD?',
      'Does the Google Business Profile module count for C.P.D. points?',
      'Is the Google Business Profile module professional development I can log?',
      'Do Google Business Profile reviews earn credits toward anything?',
      'Is the Google Business Profile module aproved?',
    ]) {
      expect(isComplianceSensitiveQuestion(q)).toBe(true);
      const kbWithMatch: CoachKnowledgeBase = {
        coachId: 'c',
        items: [{ ...KB.items[0], body: `${KB.items[0].body} ${q}` }],
      };
      expect(answerFromKnowledgeBase(q, kbWithMatch)).toEqual({
        status: 'needs_coach',
        reason: 'compliance_topic',
      });
    }
    expect(isComplianceSensitiveQuestion('How do I get more Google reviews?')).toBe(false);
    // Everyday words that merely contain a stem stay answerable.
    expect(isComplianceSensitiveQuestion('I am not certain my Google reviews are working.')).toBe(
      false
    );
    expect(isComplianceSensitiveQuestion('How do I handle uncertainty in quoting?')).toBe(false);
    expect(isComplianceSensitiveQuestion('How often should I do a price check on jobs?')).toBe(
      false
    );
    expect(isComplianceSensitiveQuestion('How do I improve my Google reviews?')).toBe(false);
  });

  it('assistant copy and the default knowledge base pass the IICRC/CEC compliance scanner', () => {
    const kb = getCoachKnowledgeBase(DEFAULT_COACHING_COACH.id);
    expect(kb).not.toBeNull();
    const text = [
      ...Object.values(ASK_COACH_COPY),
      ...(kb?.items ?? []).flatMap((i) => [i.title, i.body, i.sourceLabel]),
    ].join('\n');
    expect(complianceFindings('src/lib/coaching-portal/ask-my-coach.ts', text)).toEqual([]);
    // No knowledge-base item may mention IICRC, CEC, certification or accreditation at all.
    for (const item of kb?.items ?? []) {
      expect(isComplianceSensitiveQuestion(`${item.title} ${item.body}`)).toBe(false);
    }
  });

  it('the scanner is live: a planted approval claim in assistant copy is caught', () => {
    // Assembled at runtime so the banned phrase never sits in a tracked file for the repo guards.
    const planted = ['Ask my coach: get', 'IICRC', 'certified with CARSI.'].join(' ');
    expect(
      complianceFindings('src/lib/coaching-portal/ask-my-coach.ts', planted).length
    ).toBeGreaterThan(0);
  });

  it('the shipped assistant source files pass the scanner', () => {
    for (const f of [
      'src/lib/coaching-portal/ask-my-coach.ts',
      'src/lib/coaching-portal/coach-knowledge-base.ts',
      'src/components/coaching-portal/CoachingAskCoachPanel.tsx',
      'src/components/admin/AdminCoachingQuestionsClient.tsx',
    ]) {
      const text = readFileSync(join(process.cwd(), f), 'utf8');
      expect(complianceFindings(f, text)).toEqual([]);
    }
  });
});

describe('default knowledge base', () => {
  it('is keyed by coach and built from published coach content with sources', () => {
    const kb = getCoachKnowledgeBase(DEFAULT_COACHING_COACH.id);
    expect(kb?.coachId).toBe(DEFAULT_COACHING_COACH.id);
    expect(kb?.items.length).toBeGreaterThan(5);
    const ids = new Set<string>();
    for (const item of kb?.items ?? []) {
      expect(ids.has(item.id)).toBe(false);
      ids.add(item.id);
      expect(item.sourceHref).toMatch(/^(\/|https:\/\/)/);
    }
    expect(getCoachKnowledgeBase('some-other-coach')).toBeNull();
  });

  it('sends a CPD question to the coach even though the default material matches it', () => {
    const kb = getCoachKnowledgeBase(DEFAULT_COACHING_COACH.id);
    if (!kb) throw new Error('missing default knowledge base');
    expect(
      answerFromKnowledgeBase('Can I use the Google Business Profile module for my CPD?', kb)
    ).toEqual({ status: 'needs_coach', reason: 'compliance_topic' });
  });

  it('answers a real member question from the default coach material', () => {
    const kb = getCoachKnowledgeBase(DEFAULT_COACHING_COACH.id);
    if (!kb) throw new Error('missing default knowledge base');
    const r = answerFromKnowledgeBase('How do I stop undercharging when quoting jobs?', kb);
    expect(r.status).toBe('answered');
  });
});

describe('fail closed: auto-answer only when the cited item covers every content word', () => {
  // The GBP item covers: google, business, profile, categories, service, areas, photos, posts,
  // reviews, structured, show, locals, search. Each question below is otherwise covered, so the
  // ONLY thing that can send it to the coach is the extra word.
  it('escalates credential wording whether or not the deny-list knows the word', () => {
    for (const q of [
      'Do Google Business Profile reviews earn a cert?',
      'Google Business Profile reviews recertification',
      'Google Business Profile reviews C.E.C.',
      'Google Business Profile reviews c e c',
      'Google Business Profile reviews CPD',
      'Google Business Profile reviews cerification',
      'Google Business Profile reviews acreditation',
      'Google Business Profile reviews qualifcation',
    ]) {
      expect(answerFromKnowledgeBase(q, KB).status, q).toBe('needs_coach');
    }
  });

  it('escalates unseen novel terms the deny-list has never heard of', () => {
    // Minimal pairs: 'Google Business Profile reviews' alone is answered (next test), so the one
    // added word is the only thing that can send each of these to the coach.
    for (const q of [
      'Google Business Profile reviews RPL',
      'Google Business Profile reviews ASQA',
      'Google Business Profile reviews attainment',
      'Google Business Profile reviews competency',
      'Google Business Profile reviews badge',
      'Google Business Profile reviews QA',
      'Google Business Profile reviews x',
      'Google Business Profile reviews 2',
      'Do Google Business Profile reviews count toward my RPL?',
      'Are Google Business Profile reviews ASQA recognised?',
    ]) {
      // The deny-list does not catch these: only the coverage rule stands between them and an answer.
      expect(isComplianceSensitiveQuestion(q), q).toBe(false);
      expect(answerFromKnowledgeBase(q, KB), q).toEqual({
        status: 'needs_coach',
        reason: 'no_grounded_source',
      });
    }
  });

  it('escalates a question that adds even one uncovered word to a covered one', () => {
    expect(answerFromKnowledgeBase('Google Business Profile reviews', KB).status).toBe('answered');
    expect(answerFromKnowledgeBase('Google Business Profile reviews franchise', KB).status).toBe(
      'needs_coach'
    );
    // A long question that half-matches used to be answered at 50% coverage; no longer.
    expect(
      answerFromKnowledgeBase(
        'Google Business Profile photos reviews versus Facebook Instagram TikTok LinkedIn ads',
        KB
      ).status
    ).toBe('needs_coach');
  });

  it('every answered passage individually covers the question', () => {
    const r = answerFromKnowledgeBase('How do I stop undercharging when quoting jobs?', KB);
    expect(r.status).toBe('answered');
    if (r.status !== 'answered') return;
    expect(r.citations.map((c) => c.itemId)).toEqual(['quoting']);
  });

  it('everyday words alone never produce an answer', () => {
    expect(answerFromKnowledgeBase('How do I improve and grow my business?', KB).status).toBe(
      'needs_coach'
    );
  });

  it('Codex r5: a generic question is not answered from loosely related default material', () => {
    const kb = getCoachKnowledgeBase(DEFAULT_COACHING_COACH.id);
    if (!kb) throw new Error('missing default knowledge base');
    for (const q of [
      'How do I manage my work and business?',
      'How do I handle my clients better?',
      'How do I grow my business?',
      'How do I run my work better?',
      'How can I improve my customers work?',
    ]) {
      expect(answerFromKnowledgeBase(q, kb).status, q).toBe('needs_coach');
    }
  });

  it('allow-listed words never count toward the match: every item needs two of its own topic words', () => {
    const kb = getCoachKnowledgeBase(DEFAULT_COACHING_COACH.id);
    if (!kb) throw new Error('missing default knowledge base');
    const filler = [...ASK_COACH_EVERYDAY_WORDS].join(' ');
    for (const item of kb.items) {
      // Every word of the item, one at a time, padded with the whole allow-list: still one topic
      // word, so it must go to the coach even though nothing is uncovered.
      for (const word of `${item.title} ${item.body}`
        .split(/[^A-Za-z]+/)
        .filter((w) => w.length > 2)) {
        const r = answerFromKnowledgeBase(`${filler} ${word} ${filler}`, kb);
        expect(r.status, `${item.id}: ${word}`).toBe('needs_coach');
      }
    }
  });

  it('the allow-list holds no topic-bearing words', () => {
    for (const w of [
      'manage',
      'handle',
      'grow',
      'improve',
      'work',
      'run',
      'help',
      'make',
      'business',
      'customer',
      'customers',
      'client',
      'clients',
    ]) {
      expect(ASK_COACH_EVERYDAY_WORDS.has(w), w).toBe(false);
    }
  });

  it('the everyday allow-list is short and holds no credential wording', () => {
    expect(ASK_COACH_EVERYDAY_WORDS.size).toBeLessThanOrEqual(40);
    for (const w of ASK_COACH_EVERYDAY_WORDS) {
      expect(isComplianceSensitiveQuestion(w), w).toBe(false);
      expect(w).toMatch(/^[a-z]+$/);
    }
  });
});

describe('knowledge source: CARSI published text is the default, replaceable per coach', () => {
  it('the default coach uses the CARSI published programme and resource text', () => {
    expect(DEFAULT_COACH_KNOWLEDGE_SOURCES[DEFAULT_COACHING_COACH.id]).toBe(
      CARSI_PUBLISHED_KNOWLEDGE_SOURCE
    );
    const kb = getCoachKnowledgeBase(DEFAULT_COACHING_COACH.id);
    expect(kb?.sourceId).toBe(CARSI_PUBLISHED_KNOWLEDGE_SOURCE.id);
    // Every item is word for word from the published programme or resource text, nothing else.
    const published = new Set<string>([
      ...carsiCoachingMonthlyInclusions.flatMap((b) =>
        b.items.map((i) => `${i.title}|${i.detail}`)
      ),
      ...COACHING_RESOURCE_SECTIONS.flatMap((s) =>
        s.items.map((i) => `${i.title}|${i.description}`)
      ),
    ]);
    for (const item of kb?.items ?? []) {
      expect(published.has(`${item.title}|${item.body}`), item.id).toBe(true);
    }
  });

  it('a coach can be given their own source later (GP-631) without touching the default', () => {
    const own: CoachKnowledgeSource = {
      id: 'coach-own-test',
      label: 'Coach-owned material',
      items: () => [
        {
          id: 'own-1',
          title: 'Hiring your second technician',
          body: 'Hire when you turn away jobs every week.',
          sourceLabel: 'Coach notes',
          sourceHref: '/dashboard/coaching',
        },
      ],
    };
    const sources = { ...DEFAULT_COACH_KNOWLEDGE_SOURCES, [DEFAULT_COACHING_COACH.id]: own };
    const kb = getCoachKnowledgeBase(DEFAULT_COACHING_COACH.id, sources);
    expect(kb?.sourceId).toBe('coach-own-test');
    expect(kb?.items.map((i) => i.id)).toEqual(['own-1']);
    // The shipped default is unchanged.
    expect(getCoachKnowledgeBase(DEFAULT_COACHING_COACH.id)?.sourceId).toBe(
      CARSI_PUBLISHED_KNOWLEDGE_SOURCE.id
    );
  });

  it('a replacement source is still filtered fail-closed for compliance wording', () => {
    // Assembled at runtime so the claim never sits in a tracked file for the repo guards.
    const acronym = ['C', 'E', 'C'].join('');
    const own: CoachKnowledgeSource = {
      id: 'coach-own-test',
      label: 'Coach-owned material',
      items: () => [
        {
          id: 'bad',
          title: `Module ${acronym} hours`,
          body: `This module lists ${acronym} hours.`,
          sourceLabel: 'x',
          sourceHref: '/x',
        },
      ],
    };
    const kb = getCoachKnowledgeBase('coach-z', { 'coach-z': own });
    expect(kb?.items).toEqual([]);
  });
});

describe('helpers', () => {
  it('tags escalated questions per coach on the action board', () => {
    expect(askCoachGoalId('coach-a')).toBe('ask-coach:coach-a');
    expect(isAskCoachGoalId('ask-coach:coach-a')).toBe(true);
    expect(isAskCoachGoalId('course:123')).toBe(false);
    expect(isAskCoachGoalId(null)).toBe(false);
  });

  it('rejects empty and oversized questions', () => {
    expect(normaliseQuestion('   ')).toBeNull();
    expect(normaliseQuestion('hi')).toBeNull();
    expect(normaliseQuestion('x'.repeat(1001))).toBeNull();
    expect(normaliseQuestion('  How do I quote?  ')).toBe('How do I quote?');
  });
});
