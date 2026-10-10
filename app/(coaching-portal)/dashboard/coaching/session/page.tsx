import { redirect } from 'next/navigation';

export default function LegacySessionRedirect() {
  redirect('/dashboard/coaching/sessions');
}
