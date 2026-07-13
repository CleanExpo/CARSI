# Deploy assets

DigitalOcean App Platform Dockerfiles. Build **context** is the repository root (`source_dir: /` in `app.yaml`).

| File | Purpose |
|------|---------|
| `Dockerfile` | Production Next.js standalone image (port 8080). Runs `npm run start:production` — Prisma migrate on boot, then `node server.js`. No deploy-time course seeding. |

Migrations and startup are defined in `package.json` (`start:production`, `db:migrate:do`). Course/quiz seeding is manual only (`db:seed-courses`, `start:with-course-seed`).
