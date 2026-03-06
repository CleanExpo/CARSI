export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#050505] py-6">
      <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
        <p className="font-mono text-sm tracking-wide text-white/70">
          CARSI — Restoration Training Platform
        </p>
        <p className="font-mono text-sm tracking-wide text-white/70">
          Part of the Unite-Group Nexus
        </p>
      </div>
      <div className="container mt-3">
        <p className="text-center font-mono text-xs tracking-wider text-white/30">
          RestoreAssist &middot; CARSI &middot; Unite-Hub
        </p>
      </div>
    </footer>
  );
}
