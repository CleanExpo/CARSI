import FloatingChat from '@/components/lms/FloatingChat';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <FloatingChat />
    </>
  );
}
