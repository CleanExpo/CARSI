'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function SubscribeSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    // Hide confetti after animation
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#050505] px-4 py-16 text-white">
      {/* Success confetti effect */}
      {showConfetti && (
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          {Array.from({ length: 50 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-3 w-3 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                background: ['#00F5FF', '#00FF88', '#FFB800', '#FF00FF'][i % 4],
              }}
              initial={{ y: -20, opacity: 1 }}
              animate={{
                y: window.innerHeight + 20,
                opacity: 0,
                rotate: Math.random() * 360,
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                delay: Math.random() * 0.5,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="flex w-full max-w-lg flex-col items-center gap-8 text-center"
      >
        {/* Success icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="flex h-24 w-24 items-center justify-center rounded-full border border-[#00FF88]/30 bg-[#00FF88]/10"
        >
          <svg
            className="h-12 w-12 text-[#00FF88]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>

        {/* Heading */}
        <div>
          <h1 className="font-mono text-3xl font-bold text-white">Welcome to CARSI Pro!</h1>
          <p className="mt-3 text-white/60">
            Your subscription is now active. You have full access to all CARSI courses and
            resources.
          </p>
        </div>

        {/* What's next */}
        <div className="w-full rounded-sm border border-white/[0.06] bg-white/[0.02] p-6">
          <h2 className="mb-4 font-mono text-sm font-semibold text-white/80">What&apos;s next</h2>
          <ol className="list-none space-y-3 text-left text-sm text-white/60">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 font-mono tabular-nums text-[#00F5FF]">1.</span>
              <span>
                Open the course catalogue and pick your first course — your subscription unlocks the
                full library.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 font-mono tabular-nums text-[#00F5FF]">2.</span>
              <span>Start a lesson and earn IICRC CECs toward renewal as you complete training.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 font-mono tabular-nums text-[#00F5FF]">3.</span>
              <span>
                Use My learning to resume where you left off, and My credentials when you finish a
                course.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 font-mono tabular-nums text-[#00F5FF]">4.</span>
              <span>
                Optional: appear on the monthly recognition board — anonymous by default; you can opt
                in to a display name from your profile.
              </span>
            </li>
          </ol>
        </div>

        {/* CTA buttons */}
        <div className="flex w-full flex-col gap-3">
          <Link
            href="/dashboard/courses"
            className="w-full rounded-sm bg-[#00F5FF] py-3 font-mono text-sm font-semibold text-[#050505] transition-opacity hover:opacity-90"
          >
            Browse courses
          </Link>
          <Link
            href="/dashboard/student"
            className="w-full rounded-sm border border-white/[0.08] py-3 font-mono text-sm font-semibold text-white/80 transition-colors hover:border-white/20 hover:text-white"
          >
            Go to My learning
          </Link>
        </div>

        {/* Receipt note */}
        <p className="text-xs text-white/30">
          A receipt has been sent to your email. Your 7-day trial starts now.
          {sessionId && (
            <span className="mt-1 block">
              Session: <code className="text-white/20">{sessionId.slice(0, 16)}...</code>
            </span>
          )}
        </p>
      </motion.div>
    </main>
  );
}
