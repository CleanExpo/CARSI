'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AuthNavLinks } from '@/components/landing/AuthNavLinks';
import { PublicThemeToggle } from '@/components/landing/PublicThemeToggle';
import { PUBLIC_PRIMARY_NAV } from '@/lib/navigation/public-nav';

const smoothEase: [number, number, number, number] = [0.4, 0, 0.2, 1];

const menuVariants = {
  closed: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2, ease: smoothEase },
  },
  open: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: smoothEase },
  },
};

const itemVariants = {
  closed: { opacity: 0, x: -10 },
  open: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: smoothEase },
  }),
};

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative z-50 flex h-11 w-11 items-center justify-center rounded-md text-white/82 transition-colors duration-150 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#2490ed]/45 focus-visible:outline-none"
        style={{
          background: isOpen ? 'rgba(255,255,255,0.12)' : 'transparent',
        }}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="h-5 w-5" />
            </motion.div>
          ) : (
            <motion.div
              key="menu"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Menu className="h-5 w-5" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(15,23,42,0.34)', backdropFilter: 'blur(4px)' }}
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              variants={menuVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className="fixed top-[76px] right-0 left-0 z-40 mx-3 overflow-hidden rounded-xl"
              style={{
                background: 'rgba(255,255,255,0.98)',
                border: '1px solid rgba(15,23,42,0.12)',
                boxShadow: '0 25px 50px -18px rgba(15,23,42,0.28)',
              }}
            >
              <nav className="p-4" aria-label="Mobile navigation">
                <div className="mb-4 flex items-center justify-between px-4">
                  <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    Appearance
                  </span>
                  <PublicThemeToggle variant="light" />
                </div>

                <ul className="space-y-1">
                  {PUBLIC_PRIMARY_NAV.map((item, i) => (
                    <motion.li
                      key={item.href}
                      custom={i}
                      variants={itemVariants}
                      initial="closed"
                      animate="open"
                    >
                      <Link
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className="block min-h-11 rounded-md px-4 py-3 text-base font-semibold text-slate-800 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-[#2490ed]/40 focus-visible:outline-none"
                      >
                        {item.label}
                      </Link>
                    </motion.li>
                  ))}
                </ul>

                <AuthNavLinks variant="mobile" onNavigate={() => setIsOpen(false)} />
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
