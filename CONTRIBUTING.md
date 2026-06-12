# Contributing to SkillSats

Thank you for contributing to SkillSats. This guide explains how to configure the project, run it
locally, and verify changes before opening a pull request.

## Prerequisites

Install the following tools:

- Node.js 22.12 or newer
- npm
- Docker with Docker Compose
- An LND node with REST access for Lightning payments

[Polar](https://lightningpolar.com/) is a convenient way to run a local Bitcoin and Lightning
network. You can develop most pages without LND, but purchasing videos and withdrawing sats require
an active LND REST endpoint.

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

Update the placeholder `JWT_SECRET`, `LND_REST_HOST`, and `LND_MACAROON` values in `.env` as needed.
The variables serve these purposes:

| Variable        | Purpose                                     |
| --------------- | ------------------------------------------- |
| `DATABASE_URL`  | PostgreSQL connection string used by Prisma |
| `JWT_SECRET`    | Signs authentication cookies                |
| `LND_REST_HOST` | Base URL for the LND REST API               |
| `LND_MACAROON`  | Hex-encoded LND macaroon sent with requests |

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

Open the local URL printed by Vite, normally `http://localhost:3000`.

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

Keep server logic in `createServerFn` handlers. Client components should call those functions
directly rather than introducing separate REST endpoints or an Axios API client.

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
