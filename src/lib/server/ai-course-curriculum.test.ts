import { describe, expect, it } from 'vitest';

import { convertAiCourseCurriculum, CurriculumValidationError } from './ai-course-curriculum';

const policy = { passPercentage: 80, attemptsAllowed: 2 };
const course = { title: 'Course' };

function fixture() {
  return { modules: [{ name: 'Module', lessons: [{
    title: 'Lesson', content: 'Text',
    quiz_questions: [{ question: 'Question?', options: ['A', 'B'], correct_index: 1 }],
  }] }] };
}

// Hand-written sorted JSON, hashed independently with Node crypto, without importing the converter.
const pinnedCanonical = '{"course":{"description":null,"title":"Course"},"format":"carsi-curriculum-v1","modules":[{"description":null,"lessons":[{"kind":"reading","sourceLessonIndex":0,"textContent":"<p>Text</p>","title":"Lesson"},{"kind":"assessment","quiz":{"attemptsAllowed":2,"passPercentage":80,"questions":[{"correctIndex":1,"options":["A","B"],"points":1,"questionText":"Question?"}]},"sourceLessonIndex":0,"title":"Lesson — Knowledge check"}],"title":"Module"}]}\n';

describe('convertAiCourseCurriculum', () => {
  it('matches pinned exact UTF-8 canonical bytes and independently computed digest', () => {
    const result = convertAiCourseCurriculum(fixture(), course, policy);
    expect(result.canonicalJson).toBe(pinnedCanonical);
    expect(result.sha256).toBe('a537e3b8301927871808ad66398b5081049a98dddd4d453c00a3e0995c149411');
    expect(result.modules).toBe(result.snapshot.modules);
    expect(result.canonicalJson.endsWith('\n\n')).toBe(false);
    expect(result.canonicalJson.charCodeAt(0)).not.toBe(0xfeff);
  });

  it('retains module order, paired lessons, all assessments, options and takeaways', () => {
    const first = { ...fixture().modules[0].lessons[0], key_takeaways: ['First takeaway', 'Second takeaway'] };
    first.quiz_questions.push({ question: 'Another?', options: ['C', 'D', 'E'], correct_index: 2 });
    const second = { ...fixture().modules[0].lessons[0], title: 'Second lesson' };
    const draft = { modules: [
      { name: 'First module', description: 'Description\n\nSecond paragraph', lessons: [first, second] },
      { name: 'Next module', lessons: [second] },
    ] };
    const result = convertAiCourseCurriculum(draft, course, policy);
    expect(result.modules.map((module) => module.title)).toEqual(['First module', 'Next module']);
    expect(result.modules[0].lessons.map(({ kind, sourceLessonIndex, title }) => [kind, sourceLessonIndex, title]))
      .toEqual([
        ['reading', 0, 'Lesson'], ['assessment', 0, 'Lesson — Knowledge check'],
        ['reading', 1, 'Second lesson'], ['assessment', 1, 'Second lesson — Knowledge check'],
      ]);
    expect(result.modules[0].lessons[0]).toMatchObject({
      textContent: '<p>Description</p><p>Second paragraph</p><p>Text</p><ul><li>First takeaway</li><li>Second takeaway</li></ul>',
    });
    expect(result.modules[0].lessons[2]).toMatchObject({ textContent: '<p>Text</p>' });
    expect(result.modules[0].lessons[1]).toMatchObject({ quiz: { questions: [
      { questionText: 'Question?', options: ['A', 'B'], correctIndex: 1, points: 1 },
      { questionText: 'Another?', options: ['C', 'D', 'E'], correctIndex: 2, points: 1 },
    ] } });
    expect(result.modules[1].lessons).toHaveLength(2);
  });

  it('escapes model markup, ampersands and quotes in description, content and takeaways', () => {
    const lesson = { ...fixture().modules[0].lessons[0], content: '<script>"x" & \'y\'</script>\nnext\n\nlast', key_takeaways: ['<img src=x onerror="bad">'] };
    const result = convertAiCourseCurriculum({ modules: [{ name: 'Module', description: '<b>Intro</b>', lessons: [lesson] }] }, course, policy);
    expect(result.modules[0].lessons[0]).toMatchObject({ textContent:
      '<p>&lt;b&gt;Intro&lt;/b&gt;</p><p>&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;<br/>next</p><p>last</p><ul><li>&lt;img src=x onerror=&quot;bad&quot;&gt;</li></ul>',
    });
  });

  it('normalises CRLF and lone CR before trimming, hashing or rendering', () => {
    const make = (newline: string) => ({ modules: [{ name: ' Module ', description: ` intro${newline}line `, lessons: [{
      ...fixture().modules[0].lessons[0], content: ` text${newline}${newline}body `,
      key_takeaways: [` takeaway${newline}line `],
    }] }] });
    const expected = convertAiCourseCurriculum(make('\n'), { title: ' Course ', description: ' info\nline ' }, policy);
    expect(convertAiCourseCurriculum(make('\r\n'), { title: ' Course ', description: ' info\r\nline ' }, policy)).toEqual(expected);
    expect(convertAiCourseCurriculum(make('\r'), { title: ' Course ', description: ' info\rline ' }, policy)).toEqual(expected);
  });

  it('is deterministic and does not mutate or retain mutable source arrays', () => {
    const draft = fixture();
    const original = structuredClone(draft);
    const first = convertAiCourseCurriculum(draft, course, policy);
    expect(convertAiCourseCurriculum(draft, course, policy)).toEqual(first);
    expect(draft).toEqual(original);
    draft.modules[0].lessons[0].quiz_questions[0].options[0] = 'Changed';
    expect(first.modules[0].lessons[1]).toMatchObject({ quiz: { questions: [{ options: ['A', 'B'] }] } });
  });

  it.each([null, undefined, [], '', 3])('rejects nonobject draft %j', (draft) => {
    expect(() => convertAiCourseCurriculum(draft, course, policy)).toThrow(CurriculumValidationError);
  });

  it.each([
    {}, { modules: [] }, { modules: [null] }, { modules: [{ name: ' ', lessons: [] }] },
    { modules: [{ name: 'Module', lessons: [] }] },
    { modules: [{ name: 'Module', lessons: [null] }] },
  ])('rejects incomplete curriculum %j', (draft) => {
    expect(() => convertAiCourseCurriculum(draft, course, policy)).toThrow(CurriculumValidationError);
  });

  it.each([
    { title: '' }, { content: ' ' }, { quiz_questions: [] }, { quiz_questions: undefined },
    { key_takeaways: null }, { key_takeaways: undefined }, { key_takeaways: [''] }, { key_takeaways: [2] },
    { key_takeaways: 'text' },
  ])('rejects malformed lesson fields %j', (change) => {
    const draft = fixture();
    Object.assign(draft.modules[0].lessons[0], change);
    expect(() => convertAiCourseCurriculum(draft, course, policy)).toThrow(CurriculumValidationError);
  });

  it.each([
    { question: '' }, { options: ['A'] }, { options: ['A', ' '] }, { options: ['A', 2] },
    { correct_index: -1 }, { correct_index: 2 }, { correct_index: 0.5 },
    { correct_index: '1' }, { correct_index: true }, { correct_index: NaN }, { correct_index: Infinity },
  ])('rejects malformed question %j', (change) => {
    const draft = fixture();
    Object.assign(draft.modules[0].lessons[0].quiz_questions[0], change);
    expect(() => convertAiCourseCurriculum(draft, course, policy)).toThrow(CurriculumValidationError);
  });

  it.each([undefined, null, '80', true, 0, 101, 80.5, NaN, Infinity, -Infinity])('rejects pass percentage %j', (value) => {
    expect(() => convertAiCourseCurriculum(fixture(), course, { ...policy, passPercentage: value })).toThrow(CurriculumValidationError);
  });

  it.each([undefined, null, '2', true, 0, -1, 1.5, NaN, Infinity, 2147483648])('rejects attempts allowance %j', (value) => {
    expect(() => convertAiCourseCurriculum(fixture(), course, { ...policy, attemptsAllowed: value })).toThrow(CurriculumValidationError);
  });

  it.each([{ passPercentage: 1, attemptsAllowed: 1 }, { passPercentage: 100, attemptsAllowed: 2147483647 }])('accepts storage-domain boundary policy %j', (value) => {
    expect(convertAiCourseCurriculum(fixture(), course, value).modules[0].lessons[1]).toMatchObject({ quiz: value });
  });

  it.each([0, 1, 2, 3, 4])('rejects sparse arrays at curriculum level %i', (level) => {
    const draft = fixture();
    const lesson = draft.modules[0].lessons[0];
    const sparse = new Array(2);
    const arrays: Record<string, unknown>[] = [draft, draft.modules[0], lesson, lesson, lesson.quiz_questions[0]];
    const keys = ['modules', 'lessons', 'key_takeaways', 'quiz_questions', 'options'];
    arrays[level][keys[level]] = sparse;
    expect(() => convertAiCourseCurriculum(draft, course, policy)).toThrow(/Sparse arrays/);
  });

  it.each([null, undefined, [], {}, { title: '' }, { title: 'Course', description: 2 }])('rejects invalid course metadata %j', (value) => {
    expect(() => convertAiCourseCurriculum(fixture(), value, policy)).toThrow(CurriculumValidationError);
  });

  it('handles nullable descriptions and rejects malformed module descriptions', () => {
    const draft = fixture();
    Object.assign(draft.modules[0], { description: null });
    expect(convertAiCourseCurriculum(draft, { title: 'Course', description: null }, policy).canonicalJson).toBe(pinnedCanonical);
    Object.assign(draft.modules[0], { description: {} });
    expect(() => convertAiCourseCurriculum(draft, course, policy)).toThrow(CurriculumValidationError);
    Object.assign(draft.modules[0], { description: ' ' });
    expect(convertAiCourseCurriculum(draft, course, policy).modules[0].description).toBe('');
  });

  it('rejects invalid policy objects', () => {
    for (const value of [null, undefined, [], {}, 'policy']) {
      expect(() => convertAiCourseCurriculum(fixture(), course, value)).toThrow(CurriculumValidationError);
    }
  });

  it.each(['course title', 'course description', 'module title', 'module description', 'lesson title', 'body', 'options', 'answer', 'question', 'takeaways', 'pass percentage', 'attempts', 'lesson order', 'module order'])('binds %s in the content digest', (mutation) => {
    const draft = fixture();
    const mutatedCourse = { ...course, description: null as string | null };
    const mutatedPolicy = { ...policy };
    const lesson = draft.modules[0].lessons[0];
    if (mutation === 'lesson order') {
      draft.modules[0].lessons.push({ ...lesson, title: 'Second' });
    }
    if (mutation === 'module order') {
      draft.modules.push({ ...draft.modules[0], name: 'Second' });
    }
    const baseline = convertAiCourseCurriculum(draft, mutatedCourse, mutatedPolicy).sha256;
    switch (mutation) {
      case 'course title': mutatedCourse.title += '!'; break;
      case 'course description': mutatedCourse.description = 'Info'; break;
      case 'module title': draft.modules[0].name += '!'; break;
      case 'module description': Object.assign(draft.modules[0], { description: 'Info' }); break;
      case 'lesson title': lesson.title += '!'; break;
      case 'body': lesson.content += '!'; break;
      case 'options': lesson.quiz_questions[0].options.reverse(); break;
      case 'answer': lesson.quiz_questions[0].correct_index = 0; break;
      case 'question': lesson.quiz_questions[0].question += '!'; break;
      case 'takeaways': Object.assign(lesson, { key_takeaways: ['Info'] }); break;
      case 'pass percentage': mutatedPolicy.passPercentage = 81; break;
      case 'attempts': mutatedPolicy.attemptsAllowed = 3; break;
      case 'lesson order': draft.modules[0].lessons.reverse(); break;
      case 'module order': draft.modules.reverse(); break;
    }
    expect(convertAiCourseCurriculum(draft, mutatedCourse, mutatedPolicy).sha256).not.toBe(baseline);
  });

  it('ignores object insertion order and unrelated provider metadata in canonical content', () => {
    const draft = fixture();
    const lesson = draft.modules[0].lessons[0];
    const reordered = { modules: [{ lessons: [{
      quiz_questions: [{ correct_index: 1, options: ['A', 'B'], question: 'Question?' }],
      content: lesson.content, title: lesson.title,
    }], name: 'Module' }], provider_receipt: 'not content' };
    expect(convertAiCourseCurriculum(reordered, { description: null, title: 'Course' }, { attemptsAllowed: 2, passPercentage: 80 }).canonicalJson)
      .toBe(pinnedCanonical);
  });
});
