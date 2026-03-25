import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CredentialVerificationCard } from '@/components/lms/CredentialVerificationCard';

const validCredential = {
  credential_id: 'CARSI-WRT-2026-ABC123',
  valid: true,
  status: 'valid',
  student_name: 'James Wilson',
  course_title: 'Water Damage Restoration',
  iicrc_discipline: 'WRT',
  cec_hours: 14,
  issued_date: '12 March 2026',
  issuing_organisation: 'CARSI — Cleaning And Restoration Skills Institute',
  verification_url: 'https://carsi.com.au/credentials/CARSI-WRT-2026-ABC123',
};

describe('CredentialVerificationCard', () => {
  it('renders valid credential with VERIFIED badge', () => {
    render(<CredentialVerificationCard credential={validCredential} />);
    expect(screen.getByText('VERIFIED')).toBeInTheDocument();
    expect(screen.getByText('James Wilson')).toBeInTheDocument();
    expect(screen.getByText('Water Damage Restoration')).toBeInTheDocument();
    expect(screen.getByText('14 CECs')).toBeInTheDocument();
    expect(screen.getByText('WRT')).toBeInTheDocument();
  });

  it('renders revoked credential with REVOKED badge', () => {
    render(
      <CredentialVerificationCard
        credential={{ ...validCredential, valid: false, status: 'revoked' }}
      />
    );
    expect(screen.getByText('REVOKED')).toBeInTheDocument();
  });

  it('renders issuing organisation and credential ID', () => {
    render(<CredentialVerificationCard credential={validCredential} />);
    expect(
      screen.getByText('CARSI — Cleaning And Restoration Skills Institute')
    ).toBeInTheDocument();
    expect(screen.getByText('CARSI-WRT-2026-ABC123')).toBeInTheDocument();
  });
});
