import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LinkedInShareButton } from '@/components/lms/LinkedInShareButton';

describe('LinkedInShareButton', () => {
  const mockOpen = vi.fn();

  beforeEach(() => {
    mockOpen.mockClear();
    window.open = mockOpen;
  });

  it('renders an Add to LinkedIn button', () => {
    render(
      <LinkedInShareButton
        courseTitle="Water Damage Restoration"
        iicrcDiscipline="WRT"
        issuedYear={2026}
        issuedMonth={3}
        credentialId="CARSI-WRT-2026-ABC123"
        credentialUrl="https://carsi.com.au/credentials/CARSI-WRT-2026-ABC123"
      />
    );
    expect(screen.getByRole('button', { name: /linkedin/i })).toBeInTheDocument();
  });

  it('generates correct pre-filled LinkedIn URL on click', async () => {
    render(
      <LinkedInShareButton
        courseTitle="Water Damage Restoration"
        iicrcDiscipline="WRT"
        issuedYear={2026}
        issuedMonth={3}
        credentialId="CARSI-WRT-2026-ABC123"
        credentialUrl="https://carsi.com.au/credentials/CARSI-WRT-2026-ABC123"
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /linkedin/i }));

    expect(mockOpen).toHaveBeenCalledOnce();
    const calledUrl = mockOpen.mock.calls[0][0] as string;
    expect(calledUrl).toContain('linkedin.com/profile/add');
    expect(calledUrl).toContain('Water+Damage+Restoration');
    expect(calledUrl).toContain('CARSI');
    expect(calledUrl).toContain('CARSI-WRT-2026-ABC123');
  });
});
