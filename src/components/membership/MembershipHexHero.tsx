'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { HEX_COURSE_IMAGES } from './hex-geometry';
import { createHexRenderer, type HexRenderer, type HexState } from './hex-renderer';

type HeroState = 'pending' | HexState;

/**
 * Entry hero for the yearly membership: a floor of hexagonal tiles showing the areas the
 * CARSI library covers, that lifts into full colour wherever the visitor moves. The text stays real
 * HTML above the canvas so it is always crisp, readable and accessible. Motion can be paused at
 * any time (WCAG 2.2.2) and stops at once when the visitor turns on reduced motion.
 */
export function MembershipHexHero({ price }: { price: number }) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<HexRenderer | null>(null);
  const motionRef = useRef({ userPaused: false, reducedMotion: false });
  const [state, setState] = useState<HeroState>('pending');

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    motionRef.current = { ...motionRef.current, reducedMotion: query?.matches ?? false };
    const renderer = createHexRenderer({
      canvas,
      pointerTarget: section,
      images: HEX_COURSE_IMAGES,
      motion: motionRef.current,
      onState: setState,
    });
    rendererRef.current = renderer;
    const onPreference = (e: MediaQueryListEvent) => {
      motionRef.current = { ...motionRef.current, reducedMotion: e.matches };
      renderer?.setMotion(motionRef.current);
    };
    query?.addEventListener?.('change', onPreference);
    return () => {
      query?.removeEventListener?.('change', onPreference);
      rendererRef.current = null;
      renderer?.destroy();
    };
  }, []);

  const togglePause = () => {
    motionRef.current = { ...motionRef.current, userPaused: !motionRef.current.userPaused };
    rendererRef.current?.setMotion(motionRef.current);
  };

  const drawn = state === 'running' || state === 'paused' || state === 'static';

  return (
    <section
      ref={sectionRef}
      aria-labelledby="membership-hero-title"
      data-hex-state={state}
      className="relative isolate overflow-hidden bg-[#06101d] text-white"
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={`absolute inset-0 -z-10 h-full w-full transition-opacity duration-700 ${drawn ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        aria-hidden="true"
        className={`absolute inset-0 -z-20 bg-[radial-gradient(circle_at_50%_30%,#123a66_0%,#06101d_65%)] transition-opacity duration-700 ${drawn ? 'opacity-0' : 'opacity-100'}`}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_55%_45%_at_50%_48%,rgba(6,16,29,0.86)_0%,rgba(6,16,29,0.55)_55%,rgba(6,16,29,0)_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-28 bg-gradient-to-b from-transparent to-[#f6f8fb]"
      />

      {state === 'running' || state === 'paused' ? (
        <button
          type="button"
          onClick={togglePause}
          className="absolute top-4 right-4 z-10 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/25 bg-[#06101d]/75 px-4 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-[#0b2240] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
        >
          <span aria-hidden="true">{state === 'paused' ? '▶' : '❚❚'}</span>
          {state === 'paused' ? 'Play background motion' : 'Pause background motion'}
        </button>
      ) : null}

      <div className="pointer-events-none mx-auto flex min-h-[86vh] max-w-3xl flex-col items-center justify-center px-6 pt-24 pb-36 text-center">
        <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-[#9ccbff] uppercase backdrop-blur-sm">
          CARSI Yearly Membership
        </span>
        <h1
          id="membership-hero-title"
          className="mt-6 text-4xl leading-[1.05] font-bold tracking-tight text-balance drop-shadow-[0_0_28px_rgba(42,133,236,0.35)] sm:text-6xl"
        >
          Every course. One year. One login.
        </h1>
        <p className="mt-6 max-w-xl text-base text-pretty text-slate-300 sm:text-lg">
          Water, fire, mould, odour, drying and cleaning — 100% access to every published CARSI
          course for one learner for 12 months.
        </p>
        <p className="mt-3 text-sm text-slate-400">
          <span className="font-semibold text-white">${price} AUD a year</span> · GST included
        </p>
        <div className="pointer-events-auto mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <a
            href="#membership-plan"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#146fc2] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(42,133,236,0.45)] transition hover:bg-[#0f5fa8] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#06101d] focus-visible:outline-none"
          >
            See the membership
          </a>
          <Link
            href="/courses"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/25 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
          >
            Browse the library
          </Link>
        </div>
        {state === 'running' ? (
          <p className="mt-8 text-xs tracking-wide text-slate-400">
            Each tile shows work the library covers. Move across the floor to light them up.
          </p>
        ) : null}
      </div>
    </section>
  );
}
