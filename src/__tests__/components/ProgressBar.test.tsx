import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from '@/components/lms/ProgressBar';

describe('ProgressBar', () => {
  it('renders the percentage label', () => {
    render(<ProgressBar percentage={60} />);
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('renders 0% correctly', () => {
    render(<ProgressBar percentage={0} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('renders 100% correctly', () => {
    render(<ProgressBar percentage={100} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('clamps percentage above 100 to 100', () => {
    render(<ProgressBar percentage={120} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('clamps negative percentage to 0', () => {
    render(<ProgressBar percentage={-10} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('renders the progress bar fill element', () => {
    const { container } = render(<ProgressBar percentage={75} />);
    const fill = container.querySelector('[data-testid="progress-fill"]');
    expect(fill).toBeInTheDocument();
  });

  it('shows completed state at 100%', () => {
    render(<ProgressBar percentage={100} label="Completed" />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });
});
