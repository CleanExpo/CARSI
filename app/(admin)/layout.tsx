export default function AdminRouteGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen" style={{ background: '#060a14' }}>
      <div className="mesh-bg" aria-hidden="true">
        <div className="mesh-blob mesh-blob-1" />
        <div className="mesh-blob mesh-blob-2" />
        <div className="mesh-blob mesh-blob-3" />
      </div>
      <div className="relative z-10 flex min-h-screen w-full flex-1 flex-col">{children}</div>
    </div>
  );
}
