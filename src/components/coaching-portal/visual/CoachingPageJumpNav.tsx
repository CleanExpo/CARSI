import { coachingJumpNavLink } from '@/components/coaching-portal/coaching-ui';

export type CoachingJumpLink = { id: string; label: string };

export function CoachingPageJumpNav({
  links,
  testId = 'coaching-jump-nav',
}: {
  links: CoachingJumpLink[];
  testId?: string;
}) {
  if (links.length === 0) return null;
  return (
    <nav
      className="mt-6 flex [scrollbar-width:none] gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      aria-label="On this page"
      data-testid={testId}
    >
      {links.map((link) => (
        <a key={link.id} href={`#${link.id}`} className={coachingJumpNavLink}>
          {link.label}
        </a>
      ))}
    </nav>
  );
}
