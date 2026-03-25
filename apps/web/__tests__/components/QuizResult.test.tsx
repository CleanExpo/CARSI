import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuizResult } from '@/components/lms/QuizResult';

const passResult = {
  quiz_id: 'quiz-1',
  score_percentage: 100,
  passed: true,
  correct_count: 2,
  total_questions: 2,
};

const failResult = {
  quiz_id: 'quiz-1',
  score_percentage: 50,
  passed: false,
  correct_count: 1,
  total_questions: 2,
};

describe('QuizResult', () => {
  it('shows the score percentage', () => {
    render(<QuizResult result={passResult} onRetry={vi.fn()} />);
    expect(screen.getByText(/100%/)).toBeInTheDocument();
  });

  it('shows passed message when passed', () => {
    render(<QuizResult result={passResult} onRetry={vi.fn()} />);
    expect(screen.getByText(/passed/i)).toBeInTheDocument();
  });

  it('shows failed message when failed', () => {
    render(<QuizResult result={failResult} onRetry={vi.fn()} />);
    expect(screen.getByText(/failed/i)).toBeInTheDocument();
  });

  it('shows correct count out of total', () => {
    render(<QuizResult result={passResult} onRetry={vi.fn()} />);
    expect(screen.getByText(/2.*2/)).toBeInTheDocument();
  });

  it('shows retry button when failed', () => {
    render(<QuizResult result={failResult} onRetry={vi.fn()} />);
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('calls onRetry when retry is clicked', () => {
    const onRetry = vi.fn();
    render(<QuizResult result={failResult} onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('does not show retry button when passed', () => {
    render(<QuizResult result={passResult} onRetry={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });
});
