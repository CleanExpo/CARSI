'use client';

import { Button } from '@/components/ui/button';
import { Linkedin } from 'lucide-react';
import { CARSI_LINKEDIN_ORGANIZATION_ID } from '@/lib/brand/social-profiles';

interface LinkedInShareButtonProps {
  courseTitle: string;
  issuedYear: number;
  issuedMonth: number;
  credentialId: string;
  credentialUrl: string;
}

export function LinkedInShareButton({
  courseTitle,
  issuedYear,
  issuedMonth,
  credentialId,
  credentialUrl,
}: LinkedInShareButtonProps) {
  const handleShare = () => {
    // The certificate is named for the CARSI course only (never an IICRC discipline code), and
    // organizationId links it to CARSI's LinkedIn Page; LinkedIn ignores organizationName with it.
    const params = new URLSearchParams({
      startTask: 'CERTIFICATION_NAME',
      name: courseTitle,
      organizationId: CARSI_LINKEDIN_ORGANIZATION_ID,
      issueYear: String(issuedYear),
      issueMonth: String(issuedMonth),
      certId: credentialId,
      certUrl: credentialUrl,
    });
    window.open(
      `https://www.linkedin.com/profile/add?${params.toString()}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <Button
      onClick={handleShare}
      variant="outline"
      size="sm"
      className="gap-2 border-[#0077B5] text-[#0077B5] hover:bg-[#0077B5] hover:text-white"
      aria-label="Share on LinkedIn"
    >
      <Linkedin className="h-4 w-4" />
      Add to LinkedIn
    </Button>
  );
}
