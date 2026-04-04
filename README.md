



# CARSI — Online Training LMS

### IICRC-aligned CEC learning for cleaning and restoration professionals in Australia



**Courses → Enrolment → Lessons → Progress Tracking → Certificates**



---

## About

CARSI is a modern online training learning management system built for restoration and cleaning professionals. Learners can browse and enrol in structured courses, work through modules and lessons, track progress and completion, and generate certificates once requirements are met.

This repo contains the full CARSI web application: public marketing pages, the learner experience, checkout, and an admin dashboard.

---

## What Makes CARSI Different

- **Course-first UX**: built for clarity, progression, and momentum.
- **Progress you can trust**: module/lesson completion tracking with earned outcomes.
- **SEO-ready public site**: metadata, sitemap, and robots.
- **Admin analytics**: see users, enrolments, and completion trends.
- **Payments included**: Stripe-backed checkout for paid training.

---

## Key Features

- Public course catalogue + SEO-first pages
- Learner enrolment and structured learning flows
- Lesson/module progress tracking
- Completion + certificate generation
- Admin dashboard for users and learning analytics
- Stripe checkout + webhooks
- WordPress import pipeline (keeps course data in sync)

---

## Learning Flow (From Browse to Certificate)

1. Browse courses on the public site
2. Enrol (free or paid)
3. Complete lessons across modules
4. Track completion and progress
5. Generate your certificate on completion

---

## Tech Stack

- **Frontend**: Next.js App Router, React, TypeScript, Tailwind
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Payments**: Stripe
- **Deployment**: Docker + DigitalOcean App Platform (`app.yaml`, `Dockerfile`)

---

## Quick Start (Local)

1. Install dependencies
  ```bash
   npm install
  ```
2. Create your environment file
  ```bash
   cp .env.example .env
  ```
3. Update required variables (especially `DATABASE_URL`)
4. Start the dev server
  ```bash
   npm run dev
  ```

To build production locally:

```bash
npm run build
```

---

## Environment Variables

See `app.yaml` for DigitalOcean scopes. Common variables:

- `DATABASE_URL`: Postgres connection string
- `JWT_SECRET`: auth/session token secret
- `NEXT_PUBLIC_FRONTEND_URL`: canonical public URL (must be a valid absolute URL; do not set to an empty string)
- `NEXT_PUBLIC_APP_URL`: app origin used for runtime/CORS configuration
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Stripe public key
- `STRIPE_SECRET_KEY`: Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret
- `ADMIN_EMAIL` / `ADMIN_PASSWORD`: admin bootstrap credentials
- `NEXT_PUBLIC_ADMIN_EMAIL`: admin identifier used by the app
- `OPENAI_API_KEY`: optional AI features
- `WC_CONSUMER_KEY` / `WC_CONSUMER_SECRET`: WordPress/WooCommerce integration keys

---

## Database & Prisma

Prisma client is generated on install/build (`postinstall` + build script).

Helpful commands:

```bash
npm run prisma:generate
npm run prisma:migrate
```

Production build runs:

- `prisma generate`
- `prisma migrate deploy`
- `next build`

---

## Deployment (DigitalOcean App Platform)

Deployment uses:

- `app.yaml`: service definition + environment variable scopes
- `Dockerfile`: multi-stage build + Next.js standalone output

Notes:

- Some secrets/variables are needed at **build time** (`RUN_AND_BUILD_TIME`) so the container can generate Prisma client and perform SEO/static metadata work.
- Keep `NEXT_PUBLIC_FRONTEND_URL` as a real absolute URL (e.g. `https://carsi.com.au`).

---

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run prisma:generate
npm run prisma:migrate
npm run db:studio
```

---

## Contributing

- Keep changes focused and PR-ready
- Update Prisma migrations when the schema changes
- Make sure `npm run build` succeeds before shipping

---

## License

MIT