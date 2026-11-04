// Runs in the browser before the app starts (Next.js client instrumentation).
// Dev-only: connects Reticle so an agent can drive the local app and get pass/fail verdicts.
// The NODE_ENV check is replaced with a constant at build time, so a production build drops
// this branch and the @reticlehq/react import entirely.
if (process.env.NODE_ENV === 'development') {
  void import('@reticlehq/react').then(({ reticle, install, registerCapabilities }) => {
    install();
    // withReticle() in next.config provides these. The bridge rejects a connect with no token;
    // the root makes source paths repo-relative. The URL is found on each dev-server start, so
    // moving the daemon needs no edit here.
    const token = process.env.NEXT_PUBLIC_RETICLE_TOKEN;
    const root = process.env.NEXT_PUBLIC_RETICLE_ROOT;
    const url = process.env.NEXT_PUBLIC_RETICLE_URL;
    reticle.connect({
      projectId: 'carsi-0f3ff945',
      ...(url ? { url } : {}),
      ...(token ? { token } : {}),
      ...(root ? { root } : {}),
    });
    registerCapabilities({ testids: [], signals: [], stores: [] });
  });
}
