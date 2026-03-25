import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { DriveFileViewer } from '@/components/lms/DriveFileViewer';

describe('DriveFileViewer', () => {
  it('renders an iframe with the Drive preview URL', () => {
    const { container } = render(
      <DriveFileViewer driveFileId="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" />
    );
    const iframe = container.querySelector('iframe');
    expect(iframe).toBeInTheDocument();
    expect(iframe?.src).toContain('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms');
  });

  it('uses the Google Drive preview embed URL', () => {
    const { container } = render(<DriveFileViewer driveFileId="abc123" />);
    const iframe = container.querySelector('iframe');
    expect(iframe?.src).toContain('drive.google.com');
  });
});
