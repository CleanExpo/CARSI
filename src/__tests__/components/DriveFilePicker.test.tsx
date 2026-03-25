import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DriveFilePicker } from '@/components/lms/DriveFilePicker';

const mockFiles = [
  { id: 'file-1', name: 'Lesson 1 Video.mp4', mimeType: 'video/mp4' },
  { id: 'file-2', name: 'Handout.pdf', mimeType: 'application/pdf' },
];

describe('DriveFilePicker', () => {
  it('renders a list of drive files', () => {
    render(<DriveFilePicker files={mockFiles} onSelect={vi.fn()} />);
    expect(screen.getByText('Lesson 1 Video.mp4')).toBeInTheDocument();
    expect(screen.getByText('Handout.pdf')).toBeInTheDocument();
  });

  it('calls onSelect with the file id when a file is clicked', () => {
    const onSelect = vi.fn();
    render(<DriveFilePicker files={mockFiles} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Lesson 1 Video.mp4'));
    expect(onSelect).toHaveBeenCalledWith('file-1');
  });

  it('shows empty state when no files are provided', () => {
    render(<DriveFilePicker files={[]} onSelect={vi.fn()} />);
    expect(screen.getByText(/no files/i)).toBeInTheDocument();
  });

  it('highlights the selected file', () => {
    render(<DriveFilePicker files={mockFiles} onSelect={vi.fn()} selectedId="file-2" />);
    const selected = screen.getByText('Handout.pdf').closest('[data-selected]');
    expect(selected).toBeInTheDocument();
  });
});
