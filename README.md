# SkillSats

SkillSats is a TanStack Start application for buying educational videos and earning rewards over
Bitcoin Lightning.

## Stack

- TanStack Start and TanStack Router
- React and Tailwind CSS
- Prisma with PostgreSQL
- LND REST API

## Setup

1. Install dependencies with `npm install`.
2. Copy the default development environment with `cp .env.example .env`.
3. Start PostgreSQL with `npm run db:up`.
4. Run `npx prisma migrate dev`.
5. Run `npx prisma db seed`.
6. Start the app with `npm run dev`.

The Docker database uses the default URL already defined in `.env.example`:

```dotenv
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/skillsats"
```

Demo users are created by the seed script with password `password123`.

## Local Lightning Integration

Start a fully headless Bitcoin Core regtest network with two LND nodes:

```bash
npm run lightning:up
npm run lightning:test
```

The first startup creates wallets, mines regtest funds, and opens a balanced channel. Start the
application with the generated local credentials:

```bash
npm run dev:lightning
```

Inspect or stop the network with:

```bash
npm run lightning:check
npm run lightning:logs
npm run lightning:down
```

The helper can pay a purchase invoice from the external node:

```bash
npm run lightning:pay -- "<bolt11>"
```

It can also create an invoice on the external node for testing creator withdrawals:

```bash
npm run lightning:invoice -- 100 "Creator withdrawal"
```

See [CONTRIBUTING.md](CONTRIBUTING.md#local-lightning-integration) for network topology, liquidity,
reset commands, and the full browser test.

## Quality Checks

Run the complete local verification suite with:

```bash
npm run check
```
