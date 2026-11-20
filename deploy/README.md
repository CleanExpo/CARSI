# Deploy assets

DigitalOcean App Platform Dockerfiles. Build **context** is the repository root (`source_dir: /` in `app.yaml`).

| File         | Purpose                                                                                                                                                          |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Dockerfile` | Production Next.js standalone image (port 8080). Runs `npm run start:production` — Prisma migrate on boot, then `node server.js`. No deploy-time course seeding. |

Migrations and startup are defined in `package.json` (`start:production`, `db:migrate:do`). Course/quiz seeding is manual only and is NEVER part of startup: `start:production` runs migrations and serves, nothing else.

Use `db:import-course -- --slug=<slug>` for course curriculum. It is dry-run by default and refuses to delete learner progress or empty a curriculum without explicit consent. The legacy `db:seed-courses` deletes and recreates a course's curriculum — including learner progress — and `start:with-course-seed` (which ran it for the whole catalogue at boot) has been removed.

Local image build from repo root:

```bash
docker build -f deploy/Dockerfile -t carsi .
```
