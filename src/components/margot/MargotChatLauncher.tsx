'use client';

import { MargotAvatar } from '@/components/margot/MargotAvatar';
import { MARGOT_DISPLAY_NAME } from '@/lib/margot-surface';

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
    <button
      type="button"
      onClick={onClick}
      onPointerDown={draggable ? onDragPointerDown : undefined}
      className={`flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition hover:border-[#2490ed]/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#2490ed]/40 focus-visible:outline-none${
        draggable ? ' cursor-grab select-none active:cursor-grabbing' : ''
      }`}
      style={draggable ? { touchAction: 'none' } : undefined}
      aria-label={`Ask ${assistantName}`}
      title={draggable ? `Ask ${assistantName} — drag to move` : `Ask ${assistantName}`}
    >
      <MargotAvatar size={40} variant="launcher" showStatus />
    </button>
  );
}
