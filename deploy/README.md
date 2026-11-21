# Deploy assets

DigitalOcean App Platform Dockerfiles. Build **context** is the repository root (`source_dir: /` in `app.yaml`).

| File         | Purpose                                                                                                                                                          |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Dockerfile` | Production Next.js standalone image (port 8080). Runs `npm run start:production` — Prisma migrate on boot, then `node server.js`. No deploy-time course seeding. |

Migrations and startup are defined in `package.json` (`start:production`, `db:migrate:do`). Course/quiz seeding is manual only and is NEVER part of startup: `start:production` runs migrations and serves, nothing else.

Course curriculum is imported with `db:seed-courses` (equivalently `db:import-course`), which is the safe importer: it **reconciles** rather than replaces, so a lesson still present in the catalogue keeps its row and its learner progress. It is a **dry run until you add `--apply`**, and it refuses to delete learner progress or empty a curriculum without explicit consent.

```
npm run db:seed-courses -- --slug=<slug>            # preview one course
npm run db:seed-courses -- --slug=<slug> --apply    # write it
npm run db:seed-courses -- --all --apply            # whole catalogue, fails closed
```

The old delete-and-recreate seeder is now `db:seed-courses-legacy` and refuses to run without `--legacy-destructive-replace`. It deletes every module, lesson and learner progress row for the courses it touches. Use it only to rebuild a corrupted curriculum. `start:with-course-seed`, which ran the whole catalogue at boot, has been removed.

Local image build from repo root:

```bash
docker build -f deploy/Dockerfile -t carsi .
```
