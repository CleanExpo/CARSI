// @vitest-environment jsdom
/**
 * The course player shows progress with icons and colour: a tick on a finished lesson, a
 * green chip on an answered question. A screen-reader user gets none of that unless it is
 * also in the accessible name (WCAG 1.3.1, 1.4.1). The note box also needs a real label,
 * not only placeholder text (WCAG 3.3.2).
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { LearnerCourseOutline } from './LearnerCourseOutline';
import { LearnerLessonNotes } from './LearnerLessonNotes';
import { QuizPlayer } from './QuizPlayer';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => cleanup());

describe('LearnerCourseOutline', () => {
  const modules = [
    {
      id: 'm1',
      title: 'Moisture basics',
      lessons: [
        { id: 'l1', title: 'Reading a moisture meter', completed: true },
        { id: 'l2', title: 'Setting a dry standard', completed: false },
      ],
    },
    {
      id: 'm2',
      title: 'Drying plans',
      lessons: [{ id: 'l3', title: 'Placing air movers', completed: true }],
    },
  ];

  function outline() {
    render(
      <LearnerCourseOutline
        modules={modules}
        activeLessonId="l2"
        onSelectLesson={() => {}}
        onSelectModule={() => {}}
      />
    );
    // The outline renders once for small screens (collapsed) and once for large; the large
    // one is always in the DOM.
    return screen.getByRole('navigation', { name: 'Course outline' });
  }

  it('names a finished lesson as completed, not only with a tick icon', () => {
    const nav = outline();
    expect(within(nav).getByRole('button', { name: /Reading a moisture meter.*completed/i }))
      .toBeTruthy();
    expect(
      within(nav).queryByRole('button', { name: /Setting a dry standard.*completed/i })
    ).toBeNull();
  });

  it('names a module whose lessons are all finished as completed, not only by colour', () => {
    const nav = outline();
    expect(within(nav).getByRole('button', { name: /Drying plans.*completed/i })).toBeTruthy();
    expect(within(nav).queryByRole('button', { name: /Moisture basics.*completed/i })).toBeNull();
  });
});

describe('QuizPlayer question navigator', () => {
  const quiz = {
    id: 'quiz-1',
    title: 'Module 1 knowledge check',
    pass_percentage: 80,
    time_limit_minutes: null,
    attempts_allowed: 3,
    attempts_used: 0,
    questions: [
      {
        id: 'q1',
        question_text: 'Which reading shows wet timber?',
        question_type: 'multiple_choice',
        options: [{ text: 'Below the dry standard' }, { text: 'Above the dry standard' }],
        order_index: 0,
        points: 1,
      },
      {
        id: 'q2',
        question_text: 'Where does an air mover go?',
        question_type: 'multiple_choice',
        options: [{ text: 'Along the wet wall' }, { text: 'In the next room' }],
        order_index: 1,
        points: 1,
      },
    ],
  };

  it('says which questions are answered, not only with a green tick', () => {
    render(<QuizPlayer quiz={quiz} onSubmit={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /begin assessment/i }));
    fireEvent.click(screen.getByRole('radio', { name: 'Above the dry standard' }));

    expect(screen.getByRole('button', { name: 'Question 1, answered' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Question 2, not answered' })).toBeTruthy();
  });
});

describe('LearnerLessonNotes', () => {
  it('gives the note box a label rather than relying on its placeholder', () => {
    render(
      <LearnerLessonNotes
        noteText=""
        onNoteChange={() => {}}
        noteEditorRef={{ current: null }}
        onFormat={() => {}}
        onSaveNote={() => {}}
        onDeleteNote={() => {}}
        loadingNote={false}
        savingNote={false}
        deletingNote={false}
        noteStatus={null}
      />
    );
    const box = screen.getByRole('textbox', { name: 'Lesson notes' });
    expect(box.tagName).toBe('TEXTAREA');
  });
});
