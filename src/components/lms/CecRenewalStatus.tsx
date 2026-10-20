import type { RenewalProgress } from '@/lib/renewal-progress';
import { RENEWAL_RULE_NOTE } from '@/types/renewal';

/**
 * The status line and IICRC rule under every learner CEC renewal card (GP-655). Shared so the
 * home, My Learning and Certificates cards cannot drift apart again.
 */
export function CecRenewalStatus({
  progress,
  textClassName,
}: {
  progress: RenewalProgress;
  textClassName: string;
}) {
  return (
    <>
      <p className={`mt-3 text-[13px] ${textClassName}`}>{progress.status}</p>
      <p className={`mt-2 text-[12px] ${textClassName}`}>{RENEWAL_RULE_NOTE}</p>
    </>
  );
}

/** "12/14" inside a renewal period; a lifetime total carries no "/14". */
export function CecRenewalFigure({
  progress,
  earnedLabel,
}: {
  progress: RenewalProgress;
  earnedLabel: string;
}) {
  return (
    <>
      {earnedLabel}
      {progress.inPeriod ? (
        <span className="text-[1.05rem] font-medium text-slate-400">/{progress.target}</span>
      ) : (
        <span className="ml-1 text-[1.05rem] font-medium text-slate-400">lifetime</span>
      )}
    </>
  );
}
