'use client';

import {
  Bold,
  Code,
  Heading2,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Table,
} from 'lucide-react';
import { useId, useRef, useState } from 'react';

import { CourseFormattedBody } from '@/components/lms/CourseFormattedBody';
import { cn } from '@/lib/utils';

type Mode = 'write' | 'preview';

function wrapSelection(
  value: string,
  start: number,
  end: number,
  before: string,
  after: string,
  placeholder: string
): { next: string; selStart: number; selEnd: number } {
  const selected = value.slice(start, end);
  const inner = selected || placeholder;
  const next = `${value.slice(0, start)}${before}${inner}${after}${value.slice(end)}`;
  const selStart = start + before.length;
  const selEnd = selStart + inner.length;
  return { next, selStart, selEnd };
}

export function MarkdownEditor({
  id,
  label,
  value,
  onChange,
  placeholder,
  minRows = 10,
  disabled,
  variant = 'field',
}: {
  id?: string;
  label?: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  minRows?: number;
  disabled?: boolean;
  variant?: 'field' | 'article';
}) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const [mode, setMode] = useState<Mode>('write');
  const areaRef = useRef<HTMLTextAreaElement>(null);

  function apply(before: string, after: string, placeholder: string) {
    const el = areaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const { next, selStart, selEnd } = wrapSelection(value, start, end, before, after, placeholder);
    onChange(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(selStart, selEnd);
    });
  }

  function applyLinePrefix(prefix: string) {
    const el = areaRef.current;
    const start = el?.selectionStart ?? 0;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const next = `${value.slice(0, lineStart)}${prefix}${value.slice(lineStart)}`;
    onChange(next);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + prefix.length;
      el?.setSelectionRange(pos, pos);
    });
  }

  const tools = [
    {
      icon: Heading2,
      label: 'Module heading',
      onClick: () => {
        const n = (value.match(/^##\s+/gm) ?? []).length + 1;
        applyLinePrefix(`## Module ${n} — `);
      },
    },
    { icon: Bold, label: 'Bold', onClick: () => apply('**', '**', 'bold') },
    { icon: Italic, label: 'Italic', onClick: () => apply('_', '_', 'italic') },
    { icon: Quote, label: 'Quote', onClick: () => applyLinePrefix('> ') },
    { icon: List, label: 'Bullet list', onClick: () => applyLinePrefix('- ') },
    { icon: ListOrdered, label: 'Numbered list', onClick: () => applyLinePrefix('1. ') },
    { icon: Link2, label: 'Link', onClick: () => apply('[', '](https://)', 'link text') },
    {
      icon: ImageIcon,
      label: 'Image',
      onClick: () => apply('![', '](https://)', 'description'),
    },
    { icon: Code, label: 'Code', onClick: () => apply('`', '`', 'code') },
    {
      icon: Table,
      label: 'Table',
      onClick: () => apply('\n| Column | Column |\n| --- | --- |\n| ', ' |  |\n', 'cell'),
    },
  ];

  const article = variant === 'article';

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-white/12 bg-black/25',
        article && 'border-white/14 bg-[#0c1018]'
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-0.5">
          {tools.map((t) => (
            <button
              key={t.label}
              type="button"
              title={t.label}
              disabled={disabled || mode === 'preview'}
              onClick={t.onClick}
              className="rounded-lg p-2 text-white/50 transition-colors hover:bg-white/8 hover:text-white disabled:opacity-30"
            >
              <t.icon className="h-3.5 w-3.5" />
              <span className="sr-only">{t.label}</span>
            </button>
          ))}
        </div>
        <div className="flex rounded-lg border border-white/10 p-0.5">
          {(['write', 'preview'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                'rounded-md px-2.5 py-1 text-[11px] font-medium capitalize',
                mode === m ? 'bg-white/10 text-white' : 'text-white/45 hover:text-white/75'
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {mode === 'write' ? (
        <textarea
          id={fieldId}
          ref={areaRef}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          rows={minRows}
          placeholder={placeholder}
          spellCheck
          className={cn(
            'w-full resize-y bg-transparent outline-none placeholder:text-white/30',
            article
              ? "min-h-[min(72vh,880px)] px-8 py-10 text-left font-['Times_New_Roman',Times,serif] text-[18px] leading-[1.85] text-white/92 sm:px-16"
              : 'min-h-[180px] px-4 py-3 font-mono text-[13px] leading-relaxed text-white/90'
          )}
        />
      ) : (
        <div
          className={cn(
            article
              ? 'min-h-[min(72vh,880px)] w-full px-5 py-8 text-left sm:px-8'
              : 'min-h-[180px] px-5 py-4'
          )}
        >
          {value.trim() ? (
            <div className="course-article-body w-full text-left">
              <CourseFormattedBody text={value} tone="dark" layout="article" />
            </div>
          ) : (
            <p className="text-sm text-white/35">Nothing to preview yet.</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-white/8 px-3 py-1.5 text-[10px] text-white/30">
        <span>
          {label ? `${label} · ` : ''}
          {article
            ? 'One article for the whole course — use ## for each module'
            : 'Markdown — students see this formatting'}
        </span>
        <span className="tabular-nums">{value.length.toLocaleString()} characters</span>
      </div>
    </div>
  );
}
