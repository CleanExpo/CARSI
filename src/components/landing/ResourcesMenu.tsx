'use client';

import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';

import {
  PUBLIC_CHROME_LINK_CLASS,
  PUBLIC_LIGHT_LINK_CLASS,
} from '@/components/landing/public-shell-width';
import { PUBLIC_RESOURCES_MENU } from '@/lib/navigation/public-nav';

const ITEM_CLASS =
  'block min-h-11 rounded-md px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-[#2490ed]/40 focus-visible:outline-none';

/**
 * Disclosure menu for the "Free Resources" header item. A button with aria-expanded and
 * aria-controls toggles a list of links; Escape and an outside click close it. On mobile it
 * sits inside the existing mobile menu and expands in place.
 */
export function ResourcesMenu({
  variant = 'desktop',
  tone = 'chrome',
  onNavigate,
}: {
  variant?: 'desktop' | 'mobile';
  tone?: 'chrome' | 'light';
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    onNavigate?.();
  };

  const isMobile = variant === 'mobile';
  const buttonClass = isMobile
    ? 'flex min-h-11 w-full items-center justify-between rounded-md px-4 py-3 text-base font-semibold text-slate-800 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-[#2490ed]/40 focus-visible:outline-none'
    : `flex items-center gap-1 ${tone === 'light' ? PUBLIC_LIGHT_LINK_CLASS : PUBLIC_CHROME_LINK_CLASS}`;
  const panelClass = isMobile
    ? 'mt-1 ml-2 border-l border-slate-200 pl-2'
    : 'absolute top-full left-0 z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_20px_40px_-20px_rgba(15,23,42,0.35)]';

  return (
    <div ref={rootRef} className={isMobile ? '' : 'relative'}>
      <button
        ref={buttonRef}
        type="button"
        className={buttonClass}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {PUBLIC_RESOURCES_MENU.label}
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      <div id={panelId} hidden={!open} className={panelClass}>
        <ul>
          {PUBLIC_RESOURCES_MENU.items.map((item) => (
            <li key={item.href}>
              <Link href={item.href} onClick={close} className={ITEM_CLASS}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
