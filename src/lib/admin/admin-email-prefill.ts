const DEFAULT_ADMIN_EMAIL = 'mmlrana00@gmail.com';

/** Safe for Client Components — browser only sees NEXT_PUBLIC_ADMIN_EMAIL. */
export const ADMIN_EMAIL_PREFILL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim()) ||
  DEFAULT_ADMIN_EMAIL;
