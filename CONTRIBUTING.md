# Contributing to SkillSats

Thank you for contributing to SkillSats. This guide explains how to configure the project, run it
locally, and verify changes before opening a pull request.

## Prerequisites

Install the following tools:

- Node.js 22.12 or newer
- npm
- Docker with Docker Compose

Bitcoin Core and LND are not required to install dependencies, start the application, or run the
automated checks. Lightning configuration is optional; without it, paid video purchases, invoice
settlement polling, and withdrawals report that Lightning is unavailable while the rest of the
application continues to work.

## Install Dependencies

Clone the repository, enter its directory, and install the locked dependencies:

```bash
git clone <repository-url>
cd SkillSats
npm install
```

Use npm for dependency changes so `package-lock.json` remains authoritative.

## Configure Environment Variables

Copy the default development environment into a local `.env` file:

```bash
cp .env.example .env
```

The example config connects to the Docker PostgreSQL service with:

```dotenv
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/skillsats"
```

Replace `JWT_SECRET` before starting the application. Configure `LND_REST_HOST` and `LND_MACAROON`
only when connecting to an external LND node for Lightning integration testing.

| Variable        | Required | Purpose                                     |
| --------------- | -------- | ------------------------------------------- |
| `DATABASE_URL`  | Yes      | PostgreSQL connection string used by Prisma |
| `JWT_SECRET`    | Yes      | Signs authentication cookies                |
| `LND_REST_HOST` | No       | Base URL for an external LND REST API       |
| `LND_MACAROON`  | No       | Hex-encoded LND macaroon sent with requests |

Do not commit `.env` files or real Lightning credentials.

## Prepare the Database

Start the PostgreSQL container:

```bash
npm run db:up
```

The command waits until PostgreSQL is healthy. Its data is kept in the `postgres-data` Docker
volume, so stopping or recreating the container does not erase the development database.

Apply all migrations and generate the Prisma client:

```bash
npx prisma migrate dev
npx prisma generate
```

Seed the database with demo users, videos, and an ad:

```bash
npx prisma db seed
```

The seeded accounts all use the password `password123`:

| Role       | Email                 |
| ---------- | --------------------- |
| Learner    | `learner@test.com`    |
| Creator    | `creator@test.com`    |
| Advertiser | `advertiser@test.com` |

The seed command deletes existing application records before inserting demo data. Do not run it
against a database containing data you need to keep.

Use `npm run db:logs` to follow PostgreSQL logs and `npm run db:down` to stop the local database.

## Run in Development

Start the Vite development server:

```bash
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

TanStack Router regenerates `src/routeTree.gen.ts` when route files change. Do not edit that file
manually.

## Project Structure

```text
src/routes/          TanStack Router file-based routes
src/server/          TanStack Start server functions
src/lib/*.server.ts  Server-only database, auth, and LND infrastructure
src/components/      Shared React components
src/context/         React context providers
src/hooks/           Shared React hooks
prisma/              Schema, migrations, and seed data
```

## Routing Conventions

TanStack Start uses file-based routing. Route modules belong in `src/routes/`; do not create
Next.js or Remix structures such as `src/pages/`, `src/routes/_app/index.tsx`, or
`app/layout.tsx`. The only root layout is `src/routes/__root.tsx`.

| File                     | URL                                                            |
| ------------------------ | -------------------------------------------------------------- |
| `index.tsx`              | `/`                                                            |
| `about.tsx`              | `/about`                                                       |
| `users/index.tsx`        | `/users`                                                       |
| `users/$id.tsx`          | `/users/:id` (dynamic; bare `$`, no curly braces)              |
| `posts/{-$category}.tsx` | `/posts/:category?` (optional segment)                         |
| `files/$.tsx`            | `/files/*` (splat; read through `_splat`, never `*`)           |
| `_layout.tsx`            | Pathless layout route; render children with `<Outlet />`       |
| `__root.tsx`             | Application shell; wraps every page and preserves `<Outlet />` |

Use `.tsx` route modules for browser pages and `.ts` route modules for server-only API handlers.
Nested directories and flat dot-separated names are both supported; follow the surrounding route
style and avoid defining two files that resolve to the same URL.

The current browser routes are:

| File                 | URL               | Access                                    |
| -------------------- | ----------------- | ----------------------------------------- |
| `index.tsx`          | `/`               | Public                                    |
| `learn.$videoId.tsx` | `/learn/:videoId` | Public metadata; login for paid purchases |
| `login.tsx`          | `/login`          | Public                                    |
| `register.tsx`       | `/register`       | Public                                    |
| `earn.tsx`           | `/earn`           | Public page; login to claim rewards       |
| `wallet.tsx`         | `/wallet`         | Authenticated                             |
| `dashboard.tsx`      | `/dashboard`      | Creator accounts                          |

## Server Functions and HTTP API

Keep application business logic and authorization in `createServerFn` handlers under `src/server`.
Client components should call those typed functions directly with `useServerFn` rather than using
an Axios or `fetch` client.

Stable JSON endpoints for external clients and OpenAPI tooling live under `src/routes/api`. They
are thin server-route adapters over the same server functions; do not duplicate validation,
authorization, accounting, database, or Lightning rules in route handlers.

The API contract is maintained in `docs/openapi.json`. Update it whenever an API route, server
function input, response shape, authentication rule, or documented browser route changes. Important
conventions include:

- The local development server defaults to `http://localhost:5173`.
- Authentication uses the HTTP-only `auth_token` cookie, not a bearer token response.
- JSON mutation requests from browsers must be same-origin.
- Video creation accepts an existing `url`; multipart video upload is not implemented.
- TanStack's generated `/_serverFn` identifiers are internal transport details and are not a stable
  external API.

## Database Changes

After changing `prisma/schema.prisma`, create a descriptive migration:

```bash
npx prisma migrate dev --name describe_the_change
```

Commit both the schema change and generated migration. Validate the schema with:

```bash
npx prisma validate
```

## Quality Checks

Run the complete verification suite before submitting a change:

```bash
npm run check
```

This command checks formatting, runs ESLint and TypeScript, executes tests, and creates a production
build. Individual commands are also available:

```bash
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

Add or update tests when changing validation, accounting rules, authentication, or shared domain
behavior.

## Commit and Pull Request Guidelines

- Keep commits focused on one concern.
- Use conventional commit messages, such as `feat:`, `fix:`, `refactor:`, `test:`, or `chore:`.
- Do not commit generated build output, environment files, credentials, or unrelated formatting.
- Describe database migrations, user-visible behavior, and verification performed in the pull
  request.
- Confirm `npm run check` passes before requesting review.
