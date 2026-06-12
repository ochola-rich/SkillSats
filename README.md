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

## Quality Checks

Run the complete local verification suite with:

```bash
npm run check
```
