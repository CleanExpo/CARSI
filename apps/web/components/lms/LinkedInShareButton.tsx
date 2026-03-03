'use client';
import { Button } from '@/components/ui/button';
import { Linkedin } from 'lucide-react';

interface LinkedInShareButtonProps {
  courseTitle: string;
  iicrcDiscipline: string;
  issuedYear: number;
  issuedMonth: number;
  credentialId: string;
  credentialUrl: string;
}

export function LinkedInShareButton({
  courseTitle,
  iicrcDiscipline,
  issuedYear,
  issuedMonth,
  credentialId,
  credentialUrl,
}: LinkedInShareButtonProps) {
  const handleShare = () => {
    const params = new URLSearchParams({
      startTask: 'CERTIFICATION_NAME',
      name: `${courseTitle} (${iicrcDiscipline})`,
      organizationName: 'CARSI',
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
