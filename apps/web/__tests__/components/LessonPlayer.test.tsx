import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LessonPlayer } from '@/components/lms/LessonPlayer';

const baseLesson = {
  id: 'les-1',
  title: 'Introduction to Water Damage',
  content_type: 'text',
  content_body: '<p>Lesson content here.</p>',
  drive_file_id: null,
  duration_minutes: 15,
  is_preview: false,
  order_index: 1,
  course_id: 'crs-1',
};

describe('LessonPlayer', () => {
  it('renders the lesson title', () => {
    render(<LessonPlayer lesson={baseLesson} />);
    expect(screen.getByText('Introduction to Water Damage')).toBeInTheDocument();
  });

  it('renders text content as HTML', () => {
    render(<LessonPlayer lesson={baseLesson} />);
    expect(screen.getByText('Lesson content here.')).toBeInTheDocument();
  });

  it('renders a video element for video content type', () => {
    const lesson = {
      ...baseLesson,
      content_type: 'video',
      content_body: 'https://example.com/video.mp4',
    };
    const { container } = render(<LessonPlayer lesson={lesson} />);
    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();
  });

  it('renders an iframe for pdf content type', () => {
    const lesson = {
      ...baseLesson,
      content_type: 'pdf',
      content_body: 'https://example.com/doc.pdf',
    };
    const { container } = render(<LessonPlayer lesson={lesson} />);
    const iframe = container.querySelector('iframe');
    expect(iframe).toBeInTheDocument();
  });

  it('renders DriveFileViewer for drive_file content type', () => {
    const lesson = {
      ...baseLesson,
      content_type: 'drive_file',
      content_body: null,
      drive_file_id: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms',
    };
    const { container } = render(<LessonPlayer lesson={lesson} />);
    const iframe = container.querySelector('iframe');
    expect(iframe).toBeInTheDocument();
  });

  it('shows duration when provided', () => {
    render(<LessonPlayer lesson={baseLesson} />);
    expect(screen.getByText(/15 min/i)).toBeInTheDocument();
  });

  it('shows preview badge when is_preview is true', () => {
    const lesson = { ...baseLesson, is_preview: true };
    render(<LessonPlayer lesson={lesson} />);
    expect(screen.getByText(/preview/i)).toBeInTheDocument();
  });
});
