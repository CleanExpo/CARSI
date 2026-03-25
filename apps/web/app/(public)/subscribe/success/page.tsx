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
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
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
          className="flex h-24 w-24 items-center justify-center rounded-full border border-green-500/30 bg-green-500/10"
        >
          <svg
            className="h-12 w-12 text-green-500"
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
          <h1 className="text-3xl font-bold text-foreground">Welcome to CARSI Pro!</h1>
          <p className="mt-3 text-muted-foreground">
            Your subscription is now active. You have full access to all CARSI courses and
            resources.
          </p>
        </div>

        {/* What's next */}
        <div className="w-full rounded-sm border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold text-foreground/90">What&apos;s Next</h2>
          <ul className="space-y-3 text-left text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 text-primary">1.</span>
              <span>Browse the full course catalogue — all IICRC courses are now unlocked</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 text-primary">2.</span>
              <span>Start earning CECs towards your IICRC certifications</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 text-primary">3.</span>
              <span>Track your progress on your Student Dashboard</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 text-primary">4.</span>
              <span>Compete on the XP leaderboard with other restoration professionals</span>
            </li>
          </ul>
        </div>

        {/* CTA buttons */}
        <div className="flex w-full flex-col gap-3">
          <Link
            href="/courses"
            className="w-full rounded-sm bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Browse Courses
          </Link>
          <Link
            href="/student"
            className="w-full rounded-sm border border-border py-3 text-sm font-semibold text-foreground/90 transition-colors hover:border-border hover:text-foreground"
          >
            Go to Dashboard
          </Link>
        </div>

        {/* Receipt note */}
        <p className="text-xs text-muted-foreground/50">
          A receipt has been sent to your email. Your 7-day trial starts now.
          {sessionId && (
            <span className="mt-1 block">
              Session: <code className="text-muted-foreground/50">{sessionId.slice(0, 16)}...</code>
            </span>
          )}
        </p>
      </motion.div>
    </main>
  );
}
