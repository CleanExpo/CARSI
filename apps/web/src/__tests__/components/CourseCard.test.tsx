import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CourseCard } from '@/components/lms/CourseCard';

const mockCourse = {
  id: '1',
  slug: 'roof-restoration',
  title: 'Roof Restoration Fundamentals',
  short_description: 'Learn the basics of roof restoration',
  price_aud: 349,
  is_free: false,
  level: 'beginner',
  category: 'Roof Restoration',
  thumbnail_url: null,
  instructor: { full_name: 'Jane Smith' },
};

describe('CourseCard', () => {
  it('renders course title', () => {
    render(<CourseCard course={mockCourse} />);
    expect(screen.getByText('Roof Restoration Fundamentals')).toBeInTheDocument();
  });

  it('renders formatted AUD price', () => {
    render(<CourseCard course={mockCourse} />);
    expect(screen.getByText('$349.00')).toBeInTheDocument();
  });

  it('renders level badge', () => {
    render(<CourseCard course={mockCourse} />);
    expect(screen.getByText('beginner')).toBeInTheDocument();
  });

  it('renders instructor name', () => {
    render(<CourseCard course={mockCourse} />);
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('renders Free for free courses', () => {
    render(<CourseCard course={{ ...mockCourse, is_free: true }} />);
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('renders placeholder when no thumbnail', () => {
    render(<CourseCard course={mockCourse} />);
    expect(screen.getByText('No preview')).toBeInTheDocument();
  });

  it('links to the course detail page', () => {
    render(<CourseCard course={mockCourse} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/courses/roof-restoration');
  });
});
