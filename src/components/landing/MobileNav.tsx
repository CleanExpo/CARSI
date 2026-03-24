'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Animation Config (Council-approved Bezier)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const navItems = [
  { href: '/courses', label: 'Courses' },
  { href: '/industries', label: 'Industries' },
  { href: '/pathways', label: 'Pathways' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  // Close menu on route change or escape key
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
    <div className="md:hidden">
      {/* Hamburger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative z-50 flex h-10 w-10 items-center justify-center rounded-md transition-colors duration-150"
        style={{
          background: isOpen ? 'rgba(255,255,255,0.1)' : 'transparent',
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
              <X className="h-5 w-5" style={{ color: 'rgba(255,255,255,0.9)' }} />
            </motion.div>
          ) : (
            <motion.div
              key="menu"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Menu className="h-5 w-5" style={{ color: 'rgba(255,255,255,0.7)' }} />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
              onClick={() => setIsOpen(false)}
            />

            {/* Menu panel */}
            <motion.div
              variants={menuVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className="fixed top-16 right-0 left-0 z-40 mx-4 overflow-hidden rounded-lg"
              style={{
                background: 'rgba(10,15,26,0.98)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              }}
            >
              <nav className="p-4">
                <ul className="space-y-1">
                  {navItems.map((item, i) => (
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
                        className="block rounded-md px-4 py-3 text-base font-medium transition-colors duration-150 hover:text-white"
                        style={{
                          color: 'rgba(255,255,255,0.7)',
                          background: 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        {item.label}
                      </Link>
                    </motion.li>
                  ))}
                </ul>

                {/* Auth buttons */}
                <div
                  className="mt-4 space-y-2 border-t pt-4"
                  style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                >
                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="block rounded-md px-4 py-3 text-center text-base font-medium transition-colors duration-150"
                    style={{
                      color: 'rgba(255,255,255,0.7)',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/courses"
                    onClick={() => setIsOpen(false)}
                    className="block rounded-md px-4 py-3 text-center text-base font-medium text-white transition-opacity duration-150 hover:opacity-90"
                    style={{ background: '#ed9d24' }}
                  >
                    Browse Courses
                  </Link>
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
