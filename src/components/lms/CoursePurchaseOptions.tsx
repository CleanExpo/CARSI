'use client';

import { formSurfaceStyles, type FormSurface } from '@/components/ui/form-surface';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  MAX_TEAM_SEATS,
  MIN_TEAM_SEATS,
  type CoursePurchaseMode,
} from '@/lib/checkout-purchase-mode';

type Props = {
  mode: CoursePurchaseMode;
  onModeChange: (mode: CoursePurchaseMode) => void;
  teamSeats: number;
  onTeamSeatsChange: (seats: number) => void;
  unitPriceAud: number;
  disabled?: boolean;
  surface?: FormSurface;
};

export function CoursePurchaseOptions({
  mode,
  onModeChange,
  teamSeats,
  onTeamSeatsChange,
  unitPriceAud,
  disabled,
  surface = 'light',
}: Props) {
  const styles = formSurfaceStyles[surface];
  const totalAud = mode === 'team' ? unitPriceAud * teamSeats : unitPriceAud;

  return (
    <fieldset className={`space-y-3 rounded-lg border p-3 ${styles.card}`} disabled={disabled}>
      <legend className={`px-1 text-xs font-medium ${styles.label}`}>Who is this for?</legend>
      <label className={`flex cursor-pointer items-start gap-2.5 text-sm ${styles.label}`}>
        <input
          type="radio"
          name="purchase-mode"
          className="mt-1"
          checked={mode === 'self'}
          onChange={() => onModeChange('self')}
        />
        <span>
          <span className={`font-medium ${styles.label}`}>Just me</span>
          <span className={`mt-0.5 block text-xs ${styles.help}`}>
            One learner — you get course access.
          </span>
        </span>
      </label>
      <label className={`flex cursor-pointer items-start gap-2.5 text-sm ${styles.label}`}>
        <input
          type="radio"
          name="purchase-mode"
          className="mt-1"
          checked={mode === 'team'}
          onChange={() => onModeChange('team')}
        />
        <span className="min-w-0 flex-1">
          <span className={`font-medium ${styles.label}`}>My team</span>
          <span className={`mt-0.5 block text-xs ${styles.help}`}>
            Pay for multiple seats — you&apos;ll invite teammates after checkout.
          </span>
        </span>
      </label>
      {mode === 'team' ? (
        <div className={`space-y-1.5 border-t pt-3 ${styles.divider}`}>
          <Label htmlFor="team-seat-count" className={styles.label}>
            Number of learners (including you)
          </Label>
          <Input
            id="team-seat-count"
            type="number"
            min={MIN_TEAM_SEATS}
            max={MAX_TEAM_SEATS}
            value={teamSeats}
            onChange={(e) => {
              const v = Number.parseInt(e.target.value, 10);
              onTeamSeatsChange(Number.isFinite(v) ? v : MIN_TEAM_SEATS);
            }}
            className={styles.input}
          />
          <p className={`text-xs ${styles.help}`}>
            Total: <strong className={styles.label}>${totalAud.toFixed(0)} AUD</strong> ({teamSeats}{' '}
            × ${unitPriceAud.toFixed(0)})
          </p>
        </div>
      ) : null}
    </fieldset>
  );
}
