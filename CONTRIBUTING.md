# Contributing to SkillSats

This guide covers the minimal local development flow and the commands needed for bootstrap,
Lightning integration, database work, and verification.

## Prerequisites

Install the following tools:

- Node.js 22.12 or newer
- npm
- Docker with Docker Compose
- `curl` and `jq`

Bitcoin Core and LND are not required for most local development.

## First-time setup

After cloning the repository, run:

```bash
git clone <repository-url>
cd SkillSats
npm run setup:dev
```

That command will:

- copy `.env.example` to `.env` if needed
- install npm dependencies
- start PostgreSQL
- apply Prisma migrations
- seed the database
- start the local Lightning regtest network
- verify Lightning readiness

If you only want the app without local Lightning, use:

```bash
npm install
cp .env.example .env
npm run db:up
npx prisma migrate dev
npx prisma db seed
```

## Environment variables

Do not commit `.env` files or real Lightning credentials.

The default `.env.example` includes:

- `DATABASE_URL`
- `JWT_SECRET`
- optional Lightning values: `LND_REST_HOST`, `LND_MACAROON`, `LND_MACAROON_PATH`, `LND_TLS_CERT_PATH`

## Useful commands

- `npm run setup:dev` — bootstrap a fresh clone
- `npm run dev` — start the app without local Lightning
- `npm run dev:lightning` — start the app with the local regtest Lightning network
- `npm run db:up` — start PostgreSQL
- `npm run db:down` — stop PostgreSQL
- `npm run db:logs` — follow PostgreSQL logs
- `npx prisma migrate dev` — apply migrations locally
- `npx prisma db seed` — seed the database
- `npm run lightning:up` — start Bitcoin Core and local LND nodes
- `npm run lightning:check` — verify Lightning node readiness
- `npm run lightning:test` — run the Lightning payment test
- `npm run lightning:pay -- "<bolt11>"` — pay a BOLT11 invoice
- `npm run lightning:invoice -- 100 "memo"` — create an invoice on the payer node
- `npm run lightning:logs` — follow Lightning logs
- `npm run lightning:down` — stop the Lightning network
- `npm run lightning:reset` — remove local Lightning regtest state
- `npm run check` — run formatting, lint, typechecking, tests, and build

## Verification

Before opening a pull request, run:

```bash
npm run check
```
