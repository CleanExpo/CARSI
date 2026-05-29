'use client';

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
};

export function CoursePurchaseOptions({
  mode,
  onModeChange,
  teamSeats,
  onTeamSeatsChange,
  unitPriceAud,
  disabled,
}: Props) {
  const totalAud = mode === 'team' ? unitPriceAud * teamSeats : unitPriceAud;

  return (
    <fieldset className="space-y-3 rounded-lg border border-white/10 bg-white/[0.03] p-3" disabled={disabled}>
      <legend className="px-1 text-xs font-medium text-white/60">Who is this for?</legend>
      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-white/80">
        <input
          type="radio"
          name="purchase-mode"
          className="mt-1"
          checked={mode === 'self'}
          onChange={() => onModeChange('self')}
        />
        <span>
          <span className="font-medium text-white">Just me</span>
          <span className="mt-0.5 block text-xs text-white/45">One learner — you get course access.</span>
        </span>
      </label>
      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-white/80">
        <input
          type="radio"
          name="purchase-mode"
          className="mt-1"
          checked={mode === 'team'}
          onChange={() => onModeChange('team')}
        />
        <span className="min-w-0 flex-1">
          <span className="font-medium text-white">My team</span>
          <span className="mt-0.5 block text-xs text-white/45">
            Pay for multiple seats — you&apos;ll invite teammates after checkout.
          </span>
        </span>
      </label>
      {mode === 'team' ? (
        <div className="space-y-1.5 border-t border-white/8 pt-3">
          <Label htmlFor="team-seat-count" className="text-white/70">
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
            className="border-white/15 bg-white/5 text-white"
          />
          <p className="text-xs text-white/45">
            Total: <strong className="text-white/75">${totalAud.toFixed(0)} AUD</strong> (
            {teamSeats} × ${unitPriceAud.toFixed(0)})
          </p>
        </div>
      ) : null}
    </fieldset>
  );
}
