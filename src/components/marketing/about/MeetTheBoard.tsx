'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { boardMemberMonogram, type BoardMember } from '@/lib/board-members';
import { marketingPanel, marketingTextMuted, marketingTextStrong } from '@/lib/marketing/marketing-ui';

/** "Meet the Board" — current members with an expandable per-member dropdown. */
export function MeetTheBoard({ members }: { members: BoardMember[] }) {
  const [openName, setOpenName] = useState<string | null>(null);

  if (members.length === 0) return null;

  return (
    <ul className="mx-auto mt-8 flex max-w-3xl flex-col gap-3">
      {members.map((m) => {
        const open = openName === m.name;
        const panelId = `board-${m.name.replace(/\s+/g, '-').toLowerCase()}`;
        return (
          <li key={m.name} className={`${marketingPanel} overflow-hidden p-0`}>
            <button
              type="button"
              onClick={() => setOpenName(open ? null : m.name)}
              aria-expanded={open}
              aria-controls={panelId}
              className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-white/5"
            >
              {m.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.photoUrl}
                  alt={m.name}
                  width={48}
                  height={48}
                  className="h-12 w-12 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span
                  aria-hidden
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#146fc2]/15 text-sm font-semibold text-[#146fc2] dark:text-[#7ec5ff]"
                >
                  {boardMemberMonogram(m.name)}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className={`block truncate ${marketingTextStrong}`}>{m.name}</span>
                <span className={`block truncate text-sm ${marketingTextMuted}`}>{m.role}</span>
              </span>
              <ChevronDown
                className={`h-5 w-5 shrink-0 transition-transform ${open ? 'rotate-180' : ''} ${marketingTextMuted}`}
                aria-hidden
              />
            </button>
            {open && (
              <div id={panelId} className="border-t border-white/8 px-5 py-4">
                <p className={`text-sm leading-relaxed ${marketingTextMuted}`}>{m.bio}</p>
                {m.profileUrl && (
                  <a
                    href={m.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block text-sm font-medium text-[#146fc2] hover:underline dark:text-[#7ec5ff]"
                  >
                    View profile
                  </a>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
