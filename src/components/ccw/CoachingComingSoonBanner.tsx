export function CoachingComingSoonBanner({ label }: { label?: string }) {
  return (
    <div
      className="rounded-xl border border-amber-200/90 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      role="status"
    >
      <p className="font-semibold">{label ?? 'Coming soon'}</p>
      <p className="mt-1 leading-relaxed text-amber-900/90">
        We are finishing this part of Business Coaching. You can still subscribe to the{' '}
        <strong>$495/month</strong> program today — Phill&apos;s team will onboard you by email
        until the portal and add-on booking are live.
      </p>
    </div>
  );
}
