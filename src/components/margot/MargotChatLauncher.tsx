'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

import { MargotAvatar } from '@/components/margot/MargotAvatar';
import { MARGOT_ACCENT, MARGOT_DISPLAY_NAME } from '@/lib/margot-surface';

type Props = {
  onClick: () => void;
  assistantName?: string;
  /** GP-500: when true the launcher can be dragged to reposition the widget. */
  draggable?: boolean;
  /** GP-500: starts the framer-motion drag session on the parent widget. */
  onDragPointerDown?: (e: React.PointerEvent) => void;
};

export function MargotChatLauncher({
  onClick,
  assistantName = MARGOT_DISPLAY_NAME,
  draggable = false,
  onDragPointerDown,
}: Props) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      onPointerDown={draggable ? onDragPointerDown : undefined}
      whileHover={{ scale: 1.03, y: -1 }}
      whileTap={{ scale: 0.98 }}
      className={`group relative flex items-center gap-3 overflow-hidden rounded-full py-1.5 pr-5 pl-1.5 text-left shadow-[0_16px_48px_rgba(0,0,0,0.42)] transition-[box-shadow,transform] duration-300 hover:shadow-[0_20px_56px_rgba(36,144,237,0.28)]${
        draggable ? ' cursor-grab select-none active:cursor-grabbing' : ''
      }`}
      style={{
        background: 'linear-gradient(135deg, rgba(10,18,32,0.98) 0%, rgba(14,26,46,0.98) 100%)',
        boxShadow: `0 16px 48px rgba(0,0,0,0.42), 0 0 0 1px rgba(255,255,255,0.08), 0 0 0 1px ${MARGOT_ACCENT}18 inset`,
        ...(draggable ? { touchAction: 'none' as const } : null),
      }}
      aria-label={`Open ${assistantName}`}
      title={draggable ? `Open ${assistantName} — drag to move` : undefined}
    >
      <span
        className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(120% 80% at 18% 50%, ${MARGOT_ACCENT}14, transparent 55%)`,
        }}
        aria-hidden
      />

      <span className="relative flex shrink-0 items-center justify-center">
        <span
          className="absolute inset-0 scale-110 rounded-full opacity-60 blur-md transition-opacity duration-300 group-hover:opacity-90"
          style={{ background: `${MARGOT_ACCENT}55` }}
          aria-hidden
        />
        <span
          className="absolute -inset-0.5 rounded-full border border-[#7ec5ff]/25 opacity-70"
          aria-hidden
        />
        <MargotAvatar size={54} variant="launcher" showStatus />
      </span>

      <span className="relative hidden min-w-0 flex-col sm:flex">
        <span className="flex items-center gap-1.5 text-[15px] font-semibold tracking-tight text-white/95">
          Ask {assistantName}
          <Sparkles className="h-3.5 w-3.5 text-amber-300/90" aria-hidden />
        </span>
        <span className="text-[11px] leading-tight text-white/45">Online · CARSI assistant</span>
      </span>

      <span className="relative pr-1 text-sm font-semibold text-white/90 sm:hidden">Ask</span>
    </motion.button>
  );
}
