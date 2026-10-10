'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';

import { CoachingTextArea } from '@/components/coaching-portal/coaching-form-primitives';
import { useCoachingPortal } from '@/components/coaching-portal/CoachingPortalContext';
import {
  coachingCard,
  coachingCardTitle,
  coachingMuted,
  coachingPrimaryBtn,
} from '@/components/coaching-portal/coaching-ui';

export function CoachingSessionPrepCard() {
  const { access } = useCoachingPortal();
  const [notes, setNotes] = useState(access.workspace.sessionPrepNotes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!access.canEdit) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/coaching/portal/session-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, notifyCoach: true }),
      });
      const data = (await res.json().catch(() => ({}))) as { detail?: string };
      if (!res.ok) {
        setError(data.detail ?? 'Could not save.');
        return;
      }
      setSaved(true);
    } catch {
      setError('Could not save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={coachingCard}>
      <h2 className={coachingCardTitle}>Session prep</h2>
      <p className={`mt-2 ${coachingMuted}`}>
        What do you want to grill on this month? Wins, blockers, numbers, and decisions — Phill receives
        this when you save.
      </p>
      <div className="mt-4">
        <CoachingTextArea
          label="Topics for your next call"
          rows={5}
          value={notes}
          disabled={!access.canEdit}
          placeholder="e.g. Quote conversion dropped, need help with Google reviews, hiring first employee…"
          onChange={setNotes}
        />
      </div>
      {access.canEdit ? (
        <button type="button" className={`mt-4 ${coachingPrimaryBtn}`} disabled={saving} onClick={() => void save()}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save & notify Phill
        </button>
      ) : null}
      {saved ? (
        <p className="mt-3 text-sm font-medium text-emerald-400/95">Saved — Phill has been emailed.</p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
    </section>
  );
}
