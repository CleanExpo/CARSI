# Deploy assets

DigitalOcean App Platform Dockerfiles. Build **context** is the repository root (`source_dir: /` in `app.yaml`).

| File | Purpose |
|------|---------|
| `Dockerfile` | Production Next.js standalone image (port 8080) |
| `Dockerfile.migrate` | PRE_DEPLOY Prisma migrate job |
