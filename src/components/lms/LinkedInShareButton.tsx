'use client';

import { Button } from '@/components/ui/button';
import { CARSI_LINKEDIN_ORGANIZATION_ID } from '@/lib/brand/social-profiles';

// lucide-react 1.x dropped its brand icons (Linkedin included), so the mark is drawn inline.
function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

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
      <LinkedInIcon className="h-4 w-4" />
      Add to LinkedIn
    </Button>
  );
}
