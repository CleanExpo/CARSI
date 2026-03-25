import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CourseBuilder } from '@/components/lms/CourseBuilder';

describe('CourseBuilder', () => {
  it('renders the title input', () => {
    render(<CourseBuilder onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
  });

  it('renders the slug input', () => {
    render(<CourseBuilder onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/slug/i)).toBeInTheDocument();
  });

  it('renders the price input', () => {
    render(<CourseBuilder onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
  });

  it('renders a level selector', () => {
    render(<CourseBuilder onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/level/i)).toBeInTheDocument();
  });

  it('calls onSubmit with form data when submitted', () => {
    const onSubmit = vi.fn();
    render(<CourseBuilder onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'Water Damage Fundamentals' },
    });
    fireEvent.change(screen.getByLabelText(/slug/i), {
      target: { value: 'water-damage-fundamentals' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('pre-populates fields when initialValues are provided', () => {
    render(
      <CourseBuilder
        onSubmit={vi.fn()}
        initialValues={{ title: 'Existing Course', slug: 'existing-course' }}
      />
    );
    expect(screen.getByDisplayValue('Existing Course')).toBeInTheDocument();
    expect(screen.getByDisplayValue('existing-course')).toBeInTheDocument();
  });
});
