'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Award, Shield, Star } from 'lucide-react';
import { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Council-Approved Animation Config (Bezier principle)
// ---------------------------------------------------------------------------

const smoothEase: [number, number, number, number] = [0.4, 0, 0.2, 1]; // Council-approved smooth easing

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

// ---------------------------------------------------------------------------
// Trust Signals Data
// ---------------------------------------------------------------------------

const trustBadges = [
  { icon: Award, label: 'IICRC Approved', color: '#2490ed' },
  { icon: Shield, label: '24/7 Online Access', color: '#27ae60' },
  { icon: Star, label: '4.9★ Rating', color: '#ed9d24' },
];

const partnerLogos = [
  { name: 'IICRC', abbr: 'IICRC' },
  { name: 'ISSA', abbr: 'ISSA' },
  { name: 'NRPG', abbr: 'NRPG' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function AnimatedBadge() {
  return (
    <motion.div
      variants={fadeInUp}
      className="mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs"
      style={{
        background: 'rgba(36,144,237,0.1)',
        border: '1px solid rgba(36,144,237,0.2)',
        color: '#2490ed',
      }}
    >
      <motion.span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: '#2490ed' }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: smoothEase }}
      />
      IICRC CEC Approved
    </motion.div>
  );
}

function TrustSignals() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="mt-10 flex flex-wrap items-center gap-6"
    >
      {/* Trust badges */}
      <div className="flex items-center gap-4">
        {trustBadges.map((badge) => (
          <motion.div key={badge.label} variants={fadeIn} className="flex items-center gap-1.5">
            <badge.icon className="h-4 w-4" style={{ color: badge.color }} />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {badge.label}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Separator */}
      <div className="hidden h-4 w-px sm:block" style={{ background: 'rgba(255,255,255,0.1)' }} />

      {/* Partner logos */}
      <div className="flex items-center gap-3">
        <span
          className="text-[10px] tracking-wider uppercase"
          style={{ color: 'rgba(255,255,255,0.25)' }}
        >
          Aligned with
        </span>
        {partnerLogos.map((partner) => (
          <motion.div
            key={partner.name}
            variants={fadeIn}
            className="flex h-7 items-center justify-center rounded px-2 text-[10px] font-bold tracking-wide"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            {partner.abbr}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface AnimatedHeroProps {
  benefits: string[];
}

export function AnimatedHero({ benefits }: AnimatedHeroProps) {
  return (
    <section className="relative px-6 pt-24 pb-20">
      <div className="mx-auto max-w-6xl">
        <motion.div
          className="max-w-2xl"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <AnimatedBadge />

          <motion.h1
            variants={fadeInUp}
            transition={{ duration: 0.6, ease: smoothEase }}
            className="mb-6 text-4xl leading-tight font-bold tracking-tight sm:text-5xl"
            style={{ color: 'rgba(255,255,255,0.95)' }}
          >
            Industry-leading training.
            <br />
            <span style={{ color: '#2490ed' }}>Available 24/7.</span>
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            transition={{ duration: 0.6, ease: smoothEase, delay: 0.1 }}
            className="mb-8 max-w-lg text-lg leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            IICRC-approved CEC training for healthcare, hospitality, government, mining, commercial
            cleaning, and restoration professionals. Self-paced. Online. Always on.
          </motion.p>

          <motion.div
            variants={fadeInUp}
            transition={{ duration: 0.6, ease: smoothEase, delay: 0.2 }}
            className="mb-10 flex flex-wrap gap-3"
          >
            <Link
              href="/courses"
              className="group inline-flex items-center gap-2 rounded-md px-6 py-3 font-medium text-white transition-all duration-200 hover:scale-[1.02]"
              style={{ background: '#ed9d24' }}
            >
              Browse Courses{' '}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/pathways"
              className="inline-flex items-center gap-2 rounded-md px-6 py-3 font-medium transition-all duration-200 hover:scale-[1.02] hover:text-white"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              View Pathways
            </Link>
          </motion.div>

          {/* Animated benefit list */}
          <motion.ul
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-2"
          >
            {benefits.map((benefit, i) => (
              <motion.li
                key={benefit}
                variants={fadeInUp}
                transition={{ duration: 0.4, ease: smoothEase, delay: 0.3 + i * 0.08 }}
                className="flex items-center gap-2 text-sm"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: '#27ae60' }} />
                {benefit}
              </motion.li>
            ))}
          </motion.ul>

          <TrustSignals />
        </motion.div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Animated Stats Section
// ---------------------------------------------------------------------------

interface Stat {
  value: string;
  label: string;
}

interface AnimatedStatsProps {
  stats: Stat[];
}

export function AnimatedStats({ stats }: AnimatedStatsProps) {
  return (
    <section className="px-6 py-12" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="mx-auto max-w-6xl">
        <motion.div
          className="grid grid-cols-2 gap-8 sm:grid-cols-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              variants={fadeInUp}
              transition={{ duration: 0.5, ease: smoothEase, delay: i * 0.1 }}
              className="text-center"
            >
              <p className="text-3xl font-bold" style={{ color: '#2490ed' }}>
                {stat.value}
              </p>
              <p
                className="mt-1 text-xs tracking-wide uppercase"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                {stat.label}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Animated Course Card Wrapper
// ---------------------------------------------------------------------------

interface AnimatedCardProps {
  children: ReactNode;
  index: number;
}

export function AnimatedCard({ children, index }: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.5, ease: smoothEase, delay: index * 0.1 }}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Animated Section Header
// ---------------------------------------------------------------------------

interface AnimatedSectionProps {
  label: string;
  title: string;
  children: ReactNode;
  rightContent?: ReactNode;
}

export function AnimatedSection({ label, title, children, rightContent }: AnimatedSectionProps) {
  return (
    <section className="px-6 py-16" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="mx-auto max-w-6xl">
        <motion.div
          className="mb-8 flex items-end justify-between"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: smoothEase }}
        >
          <div>
            <p
              className="mb-1 text-xs tracking-wide uppercase"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              {label}
            </p>
            <h2 className="text-2xl font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>
              {title}
            </h2>
          </div>
          {rightContent}
        </motion.div>
        {children}
      </div>
    </section>
  );
}
