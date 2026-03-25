import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdminMetrics } from '@/components/lms/AdminMetrics';

const mockMetrics = {
  total_users: 42,
  total_courses: 8,
  total_enrollments: 120,
};

describe('AdminMetrics', () => {
  it('renders total users', () => {
    render(<AdminMetrics metrics={mockMetrics} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders total courses', () => {
    render(<AdminMetrics metrics={mockMetrics} />);
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('renders total enrollments', () => {
    render(<AdminMetrics metrics={mockMetrics} />);
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  it('renders metric labels', () => {
    render(<AdminMetrics metrics={mockMetrics} />);
    expect(screen.getByText(/users/i)).toBeInTheDocument();
    expect(screen.getByText(/courses/i)).toBeInTheDocument();
    expect(screen.getByText(/enrolments/i)).toBeInTheDocument();
  });
});
