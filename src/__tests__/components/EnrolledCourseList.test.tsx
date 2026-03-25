import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EnrolledCourseList } from '@/components/lms/EnrolledCourseList';

const mockEnrollments = [
  {
    id: 'enr-1',
    course_id: 'crs-1',
    course_title: 'Water Damage Restoration Fundamentals',
    course_slug: 'water-damage-restoration-fundamentals',
    status: 'active',
    enrolled_at: '2026-03-01T10:00:00Z',
    completion_percentage: 40,
  },
  {
    id: 'enr-2',
    course_id: 'crs-2',
    course_title: 'Carpet and Rug Cleaning Techniques',
    course_slug: 'carpet-rug-cleaning-techniques',
    status: 'completed',
    enrolled_at: '2026-02-15T10:00:00Z',
    completion_percentage: 100,
  },
];

describe('EnrolledCourseList', () => {
  it('renders all enrolled courses', () => {
    render(<EnrolledCourseList enrollments={mockEnrollments} />);
    expect(screen.getByText('Water Damage Restoration Fundamentals')).toBeInTheDocument();
    expect(screen.getByText('Carpet and Rug Cleaning Techniques')).toBeInTheDocument();
  });

  it('renders the correct number of courses', () => {
    render(<EnrolledCourseList enrollments={mockEnrollments} />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
  });

  it('shows an empty state when there are no enrolments', () => {
    render(<EnrolledCourseList enrollments={[]} />);
    expect(screen.getByText(/no courses yet/i)).toBeInTheDocument();
  });

  it('links each course to the correct detail page', () => {
    render(<EnrolledCourseList enrollments={mockEnrollments} />);
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', '/courses/water-damage-restoration-fundamentals');
  });

  it('shows the completed badge for finished courses', () => {
    render(<EnrolledCourseList enrollments={mockEnrollments} />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('shows progress percentage for active courses', () => {
    render(<EnrolledCourseList enrollments={mockEnrollments} />);
    expect(screen.getByText('40%')).toBeInTheDocument();
  });
});
