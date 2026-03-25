import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuizPlayer } from '@/components/lms/QuizPlayer';

const mockQuiz = {
  id: 'quiz-1',
  title: 'Water Damage Basics Quiz',
  pass_percentage: 70,
  time_limit_minutes: null,
  attempts_allowed: 3,
  questions: [
    {
      id: 'q-1',
      question_text: 'What is the first step?',
      question_type: 'multiple_choice',
      options: [{ text: 'Extract water' }, { text: 'Paint walls' }],
      order_index: 1,
      points: 1,
    },
    {
      id: 'q-2',
      question_text: 'Which tool is used?',
      question_type: 'multiple_choice',
      options: [{ text: 'Wet vacuum' }, { text: 'Paint roller' }],
      order_index: 2,
      points: 1,
    },
  ],
};

describe('QuizPlayer', () => {
  it('renders the quiz title', () => {
    render(<QuizPlayer quiz={mockQuiz} onSubmit={vi.fn()} />);
    expect(screen.getByText('Water Damage Basics Quiz')).toBeInTheDocument();
  });

  it('renders all questions', () => {
    render(<QuizPlayer quiz={mockQuiz} onSubmit={vi.fn()} />);
    expect(screen.getByText('What is the first step?')).toBeInTheDocument();
    expect(screen.getByText('Which tool is used?')).toBeInTheDocument();
  });

  it('renders answer options for each question', () => {
    render(<QuizPlayer quiz={mockQuiz} onSubmit={vi.fn()} />);
    expect(screen.getByText('Extract water')).toBeInTheDocument();
    expect(screen.getByText('Wet vacuum')).toBeInTheDocument();
  });

  it('allows selecting an answer', () => {
    render(<QuizPlayer quiz={mockQuiz} onSubmit={vi.fn()} />);
    const radio = screen.getAllByRole('radio')[0];
    fireEvent.click(radio);
    expect(radio).toBeChecked();
  });

  it('calls onSubmit with answers when submitted', () => {
    const onSubmit = vi.fn();
    render(<QuizPlayer quiz={mockQuiz} onSubmit={onSubmit} />);

    // Select first option for both questions
    const radios = screen.getAllByRole('radio');
    fireEvent.click(radios[0]); // Q1 option 0
    fireEvent.click(radios[2]); // Q2 option 0

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('shows pass percentage requirement', () => {
    render(<QuizPlayer quiz={mockQuiz} onSubmit={vi.fn()} />);
    expect(screen.getByText(/70%/)).toBeInTheDocument();
  });
});
