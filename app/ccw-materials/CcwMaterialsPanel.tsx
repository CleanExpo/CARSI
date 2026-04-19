'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { CcwMaterial } from '@/lib/ccw/file-registry';

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export function CcwMaterialsPanel({ materials }: { materials: CcwMaterial[] }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch('/api/ccw-materials/auth', { method: 'DELETE' });
      router.refresh();
    } catch {
      setSigningOut(false);
    }
  }

  return (
    <div className="space-y-4">
      <div
        className="rounded-lg p-4"
        style={{
          background: 'rgba(44,95,45,0.12)',
          border: '1px solid rgba(151,188,98,0.35)',
        }}
      >
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
          Access granted. Your three workshop take-home files are listed below. The Participant
          Manual is provided in both PDF and Word formats — use whichever suits your workflow.
        </p>
      </div>

      <ul className="space-y-3">
        {materials.map((m) => (
          <li
            key={m.key}
            className="rounded-lg p-5"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <h3
                  className="mb-1 text-base font-semibold"
                  style={{ color: 'rgba(255,255,255,0.92)' }}
                >
                  {m.displayName}
                </h3>
                <p
                  className="mb-2 text-xs leading-relaxed"
                  style={{ color: 'rgba(255,255,255,0.55)' }}
                >
                  {m.description}
                </p>
                <p
                  className="text-[11px] tracking-wide uppercase"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                >
                  {formatSize(m.sizeBytes)}
                </p>
              </div>
              <a
                href={`/api/ccw-materials/download?file=${encodeURIComponent(m.key)}`}
                className="inline-flex shrink-0 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: '#2C5F2D', color: '#ffffff' }}
                download
              >
                Download
              </a>
            </div>
          </li>
        ))}
      </ul>

      <div className="pt-4">
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="text-xs transition-opacity disabled:opacity-50"
          style={{ color: 'rgba(255,255,255,0.45)' }}
        >
          {signingOut ? 'Signing out…' : 'Sign out of materials access'}
        </button>
      </div>
    </div>
  );
}
