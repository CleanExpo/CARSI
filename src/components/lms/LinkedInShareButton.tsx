'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Linkedin, Sparkles, Copy, CheckCheck, X } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

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
  const [draftOpen, setDraftOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  const handleGenerateDraft = async () => {
    setDraftOpen(true);
    if (draft) return; // already fetched
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.post<{ draft: string }>(
        `/api/lms/credentials/${credentialId}/linkedin-draft`,
        {}
      );
      setDraft(data.draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard access denied — silently ignore
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
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

        <Button
          onClick={handleGenerateDraft}
          variant="outline"
          size="sm"
          className="gap-2 rounded-sm border-white/10 text-white/60 hover:border-[#2490ed]/50 hover:text-white"
          aria-label="Generate AI LinkedIn post draft"
        >
          <Sparkles className="h-4 w-4" style={{ color: '#2490ed' }} />
          AI Draft
        </Button>
      </div>

      {/* Draft modal */}
      <AnimatePresence>
        {draftOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(5,5,5,0.8)', backdropFilter: 'blur(8px)' }}
            role="dialog"
            aria-modal="true"
            aria-label="LinkedIn post draft"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="relative w-full max-w-md rounded-sm border border-white/[0.06] p-6"
              style={{ background: '#060a14' }}
            >
              <button
                onClick={() => setDraftOpen(false)}
                className="absolute top-4 right-4 text-white/30 transition-colors hover:text-white/70"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4" style={{ color: '#2490ed' }} />
                <h3 className="text-sm font-semibold text-white">AI LinkedIn Draft</h3>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div
                    className="h-8 w-8 animate-spin rounded-full border-2 border-transparent"
                    style={{ borderTopColor: '#2490ed' }}
                  />
                </div>
              ) : error ? (
                <p className="py-4 text-center text-sm text-red-400">{error}</p>
              ) : (
                <>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={8}
                    className="w-full resize-none rounded-sm border border-white/[0.06] bg-white/[0.03] p-3 text-sm text-white/80 placeholder-white/20 focus:ring-1 focus:ring-[#2490ed]/50 focus:outline-none"
                    aria-label="LinkedIn post draft text"
                  />
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <Button
                      onClick={handleCopy}
                      size="sm"
                      className="gap-2 rounded-sm"
                      style={{ background: '#2490ed', color: '#fff' }}
                    >
                      {copied ? (
                        <>
                          <CheckCheck className="h-4 w-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy to Clipboard
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
