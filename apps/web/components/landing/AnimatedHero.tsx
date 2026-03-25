'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Award, Shield, Star } from 'lucide-react';
import { ReactNode } from 'react';

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
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const trustBadges = [
  { icon: Award, label: 'IICRC Approved', className: 'text-primary' },
  { icon: Shield, label: '24/7 Online Access', className: 'text-green-500' },
  { icon: Star, label: '140+ Courses', className: 'text-carsi-orange' },
];

const partnerLogos = [
  { name: 'IICRC', abbr: 'IICRC' },
  { name: 'ISSA', abbr: 'ISSA' },
  { name: 'NRPG', abbr: 'NRPG' },
];

function AnimatedBadge() {
  return (
    <motion.div
      variants={fadeInUp}
      className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary"
    >
      <motion.span
        className="h-1.5 w-1.5 rounded-full bg-primary"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
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
      <div className="flex items-center gap-4">
        {trustBadges.map((badge) => (
          <motion.div key={badge.label} variants={fadeIn} className="flex items-center gap-1.5">
            <badge.icon className={`h-4 w-4 ${badge.className}`} />
            <span className="text-xs text-muted-foreground">{badge.label}</span>
          </motion.div>
        ))}
      </div>

      <div className="hidden h-4 w-px bg-border sm:block" />

      <div className="flex items-center gap-3">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50">
          Aligned with
        </span>
        {partnerLogos.map((partner) => (
          <motion.div
            key={partner.name}
            variants={fadeIn}
            className="flex h-7 items-center justify-center rounded-sm border border-border bg-secondary px-2 text-[10px] font-bold tracking-wide text-muted-foreground"
          >
            {partner.abbr}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

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
            transition={{ duration: 0.6 }}
            className="mb-6 text-4xl leading-tight font-bold tracking-tight text-foreground sm:text-5xl"
          >
            Industry-leading training.
            <br />
            <span className="text-primary">Available 24/7.</span>
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-8 max-w-lg text-lg leading-relaxed text-muted-foreground"
          >
            IICRC-approved CEC training for healthcare, hospitality, government, mining, commercial
            cleaning, and restoration professionals. Self-paced. Online. Always on.
          </motion.p>

          <motion.div
            variants={fadeInUp}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-10 flex flex-wrap gap-3"
          >
            <Link
              href="/courses"
              className="group inline-flex items-center gap-2 rounded-sm bg-carsi-orange px-6 py-3 font-medium text-white transition-colors hover:bg-carsi-orange/90"
            >
              Browse Courses{' '}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/pathways"
              className="inline-flex items-center gap-2 rounded-sm border border-border bg-secondary px-6 py-3 font-medium text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
            >
              View Pathways
            </Link>
          </motion.div>

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
                transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-500" />
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

interface Stat {
  value: string;
  label: string;
}

interface AnimatedStatsProps {
  stats: Stat[];
}

export function AnimatedStats({ stats }: AnimatedStatsProps) {
  return (
    <section className="border-t border-border px-6 py-12">
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
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center"
            >
              <p className="text-3xl font-bold text-primary">{stat.value}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

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
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedSectionProps {
  label: string;
  title: string;
  children: ReactNode;
  rightContent?: ReactNode;
}

export function AnimatedSection({ label, title, children, rightContent }: AnimatedSectionProps) {
  return (
    <section className="border-t border-border px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <motion.div
          className="mb-8 flex items-end justify-between"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground/60">
              {label}
            </p>
            <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          </div>
          {rightContent}
        </motion.div>
        {children}
      </div>
    </section>
  );
}
