import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModuleEditor } from '@/components/lms/ModuleEditor';

const mockModules = [
  {
    id: 'mod-1',
    title: 'Module 1: Introduction',
    order_index: 1,
    lessons: [],
  },
  {
    id: 'mod-2',
    title: 'Module 2: Advanced Techniques',
    order_index: 2,
    lessons: [],
  },
];

describe('ModuleEditor', () => {
  it('renders all modules', () => {
    render(
      <ModuleEditor
        modules={mockModules}
        onAddModule={vi.fn()}
        onDeleteModule={vi.fn()}
        onAddLesson={vi.fn()}
      />
    );
    expect(screen.getByText('Module 1: Introduction')).toBeInTheDocument();
    expect(screen.getByText('Module 2: Advanced Techniques')).toBeInTheDocument();
  });

  it('calls onAddModule when add button is clicked', () => {
    const onAddModule = vi.fn();
    render(
      <ModuleEditor
        modules={[]}
        onAddModule={onAddModule}
        onDeleteModule={vi.fn()}
        onAddLesson={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /add module/i }));
    expect(onAddModule).toHaveBeenCalledOnce();
  });

  it('calls onDeleteModule with module id when delete is clicked', () => {
    const onDeleteModule = vi.fn();
    render(
      <ModuleEditor
        modules={mockModules}
        onAddModule={vi.fn()}
        onDeleteModule={onDeleteModule}
        onAddLesson={vi.fn()}
      />
    );
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);
    expect(onDeleteModule).toHaveBeenCalledWith('mod-1');
  });

  it('shows an empty state when no modules exist', () => {
    render(
      <ModuleEditor
        modules={[]}
        onAddModule={vi.fn()}
        onDeleteModule={vi.fn()}
        onAddLesson={vi.fn()}
      />
    );
    expect(screen.getByText(/no modules/i)).toBeInTheDocument();
  });
});
