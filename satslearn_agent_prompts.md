# SatsLearn — AI Coding Agent Prompt Sequence
> TanStack Start Full-Stack Edition · 12 Ordered Prompts

**How to use:** Feed these to your coding agent (Codex / Cursor / Claude) **one at a time**, in order. Wait for each to complete before proceeding. Every prompt is self-contained with the context the agent needs.

**Architecture correction in effect:** There is no separate Express backend. All server logic lives inside **TanStack Start server functions** (`createServerFn` from `@tanstack/start`). The app was scaffolded with `@tanstack/start`, `@tanstack/react-router`, React, and TypeScript. Do not create a separate `server/` process.

---

## Prompt 1 — Prisma Schema & Database Client

> **[AGENT TASK — P1: DATABASE SETUP]**
>
> You are working inside a **TanStack Start full-stack monorepo** (React + `@tanstack/react-router` + `createServerFn`). There is no separate Express backend. The database layer uses **Prisma ORM with PostgreSQL**.
>
> **Step 1 — Install dependencies.** Run the following in the project root:
> ```
> npm install prisma @prisma/client bcryptjs jsonwebtoken axios
> npm install -D @types/bcryptjs @types/jsonwebtoken
> npx prisma init
> ```
>
> **Step 2 — Write the Prisma schema.** Replace the contents of `prisma/schema.prisma` with exactly the following:
>
> ```prisma
> generator client {
>   provider = "prisma-client-js"
> }
>
> datasource db {
>   provider = "postgresql"
>   url      = env("DATABASE_URL")
> }
>
> enum Role {
>   LEARNER
>   CREATOR
>   ADVERTISER
> }
>
> model User {
>   id          String     @id @default(uuid())
>   email       String     @unique
>   username    String     @unique
>   password    String
>   role        Role       @default(LEARNER)
>   balanceSats Int        @default(0)
>   createdAt   DateTime   @default(now())
>   videos      Video[]
>   purchases   Purchase[]
>   adWatches   AdWatch[]
> }
>
> model Video {
>   id          String     @id @default(uuid())
>   title       String
>   description String
>   url         String
>   priceSats   Int
>   isFree      Boolean    @default(false)
>   courseId    String
>   creatorId   String
>   creator     User       @relation(fields: [creatorId], references: [id])
>   purchases   Purchase[]
>   createdAt   DateTime   @default(now())
> }
>
> model Purchase {
>   id        String   @id @default(uuid())
>   userId    String
>   videoId   String
>   paidSats  Int
>   invoice   String
>   rHash     String
>   settled   Boolean  @default(false)
>   createdAt DateTime @default(now())
>   user      User     @relation(fields: [userId], references: [id])
>   video     Video    @relation(fields: [videoId], references: [id])
> }
>
> model Ad {
>   id         String    @id @default(uuid())
>   title      String
>   videoUrl   String
>   budgetSats Int
>   spentSats  Int       @default(0)
>   rewardSats Int
>   active     Boolean   @default(true)
>   watches    AdWatch[]
> }
>
> model AdWatch {
>   id         String   @id @default(uuid())
>   userId     String
>   adId       String
>   earnedSats Int
>   watchedAt  DateTime @default(now())
>   user       User     @relation(fields: [userId], references: [id])
>   ad         Ad       @relation(fields: [adId], references: [id])
> }
> ```
>
> **Step 3 — Create the Prisma singleton client.** Create the file `src/lib/db.ts` with the following content. Use a global singleton to prevent multiple Prisma client instances during development hot-reloads:
>
> ```typescript
> import { PrismaClient } from '@prisma/client'
>
> const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
>
> export const db = globalForPrisma.prisma ?? new PrismaClient({ log: ['error'] })
>
> if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
> ```
>
> **Step 4 — Run the migration:**
> ```
> npx prisma migrate dev --name init
> npx prisma generate
> ```
>
> **Step 5 — Add these variables to `.env`** (do not commit this file):
> ```
> DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/satslearn"
> JWT_SECRET="satslearn-hackathon-secret-change-in-prod"
> LND_REST_HOST="https://localhost:8080"
> LND_MACAROON="0201036c6e64..."
> ```
>
> Do not create any route files or server functions yet. Confirm the migration ran successfully.

---

## Prompt 2 — LND REST Client

> **[AGENT TASK — P2: LND CLIENT]**
>
> You are working inside a **TanStack Start full-stack monorepo** using `createServerFn`. The Prisma schema and `src/lib/db.ts` are already in place from the previous step.
>
> Create the file `src/lib/lnd.ts`. This module exports a pre-configured **axios instance** that speaks to the LND REST API. This file will **only ever be imported inside server functions** — never in client-side code.
>
> ```typescript
> import axios from 'axios'
> import https from 'https'
>
> if (!process.env.LND_REST_HOST || !process.env.LND_MACAROON) {
>   console.warn('[LND] Warning: LND_REST_HOST or LND_MACAROON env vars are missing.')
> }
>
> export const lnd = axios.create({
>   baseURL: process.env.LND_REST_HOST,
>   headers: {
>     'Grpc-Metadata-Macaroon': process.env.LND_MACAROON ?? '',
>     'Content-Type': 'application/json',
>   },
>   // Skip TLS cert verification for local Polar dev node only
>   httpsAgent: new https.Agent({ rejectUnauthorized: false }),
>   timeout: 10000,
> })
>
> // LND API reference used in this project:
> // POST /v1/invoices               → create invoice (returns payment_request + r_hash)
> // GET  /v1/invoice/{r_hash_hex}  → check settlement status (returns { settled: bool })
> // POST /v1/channels/transactions  → send payment to external wallet (withdrawal)
> // GET  /v1/getinfo               → node health check
>
> export async function lndHealthCheck() {
>   const { data } = await lnd.get('/v1/getinfo')
>   return { alias: data.alias, pubkey: data.identity_pubkey, synced: data.synced_to_chain }
> }
> ```
>
> **Important note on `r_hash`:** The LND REST API returns `r_hash` as a **base64-encoded** string. When polling `GET /v1/invoice/{r_hash}`, you must pass the **hex-encoded** version. Store both in the database. The conversion is:
>
> ```typescript
> export function b64ToHex(b64: string) {
>   return Buffer.from(b64, 'base64').toString('hex')
> }
> ```
>
> Add this `b64ToHex` helper to the bottom of `src/lib/lnd.ts` and export it.
>
> Do not create any routes or server functions yet.

---

## Prompt 3 — Auth Utilities & Server Functions

> **[AGENT TASK — P3: AUTH]**
>
> You are working inside a **TanStack Start full-stack monorepo** using `createServerFn` from `@tanstack/start`. Auth state is stored in an **HTTP-only cookie** named `auth_token`. Use `vinxi/http` to read and set cookies inside server functions — this is the correct TanStack Start API for cookie access.
>
> **Step 1 — Create `src/lib/auth.ts`** (server-only utilities, never import in client components):
>
> ```typescript
> import jwt from 'jsonwebtoken'
> import { getCookie, setCookie, deleteCookie } from 'vinxi/http'
> import { db } from './db'
>
> const JWT_SECRET = process.env.JWT_SECRET!
>
> export type JwtPayload = { userId: string; role: string; username: string }
>
> export function signToken(payload: JwtPayload): string {
>   return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
> }
>
> export function verifyToken(token: string): JwtPayload {
>   return jwt.verify(token, JWT_SECRET) as JwtPayload
> }
>
> export function setAuthCookie(token: string) {
>   setCookie('auth_token', token, {
>     httpOnly: true,
>     secure: process.env.NODE_ENV === 'production',
>     sameSite: 'lax',
>     maxAge: 60 * 60 * 24 * 7, // 7 days
>     path: '/',
>   })
> }
>
> export function clearAuthCookie() {
>   deleteCookie('auth_token')
> }
>
> // Call this inside any server function that requires authentication.
> // Throws a descriptive error if the user is not logged in or token is invalid.
> export async function requireAuth() {
>   const token = getCookie('auth_token')
>   if (!token) throw new Error('UNAUTHENTICATED')
>   const payload = verifyToken(token)
>   const user = await db.user.findUnique({ where: { id: payload.userId } })
>   if (!user) throw new Error('USER_NOT_FOUND')
>   return user
> }
>
> // Like requireAuth but also checks the user's role.
> export async function requireRole(role: string) {
>   const user = await requireAuth()
>   if (user.role !== role) throw new Error('FORBIDDEN')
>   return user
> }
> ```
>
> **Step 2 — Create `src/server/auth.ts`** (all auth server functions):
>
> ```typescript
> import { createServerFn } from '@tanstack/start'
> import bcrypt from 'bcryptjs'
> import { z } from 'zod' // install zod if not present: npm install zod
> import { db } from '../lib/db'
> import { signToken, setAuthCookie, clearAuthCookie, requireAuth } from '../lib/auth'
>
> // --- REGISTER ---
> export const registerUser = createServerFn({ method: 'POST' })
>   .validator((data: { email: string; username: string; password: string; role: 'LEARNER' | 'CREATOR' | 'ADVERTISER' }) => data)
>   .handler(async ({ data }) => {
>     const existing = await db.user.findFirst({
>       where: { OR: [{ email: data.email }, { username: data.username }] },
>     })
>     if (existing) throw new Error('EMAIL_OR_USERNAME_TAKEN')
>
>     const hashedPassword = await bcrypt.hash(data.password, 10)
>     const user = await db.user.create({
>       data: {
>         email: data.email,
>         username: data.username,
>         password: hashedPassword,
>         role: data.role,
>       },
>     })
>
>     const token = signToken({ userId: user.id, role: user.role, username: user.username })
>     setAuthCookie(token)
>     return { id: user.id, username: user.username, role: user.role, balanceSats: user.balanceSats }
>   })
>
> // --- LOGIN ---
> export const loginUser = createServerFn({ method: 'POST' })
>   .validator((data: { email: string; password: string }) => data)
>   .handler(async ({ data }) => {
>     const user = await db.user.findUnique({ where: { email: data.email } })
>     if (!user) throw new Error('INVALID_CREDENTIALS')
>
>     const valid = await bcrypt.compare(data.password, user.password)
>     if (!valid) throw new Error('INVALID_CREDENTIALS')
>
>     const token = signToken({ userId: user.id, role: user.role, username: user.username })
>     setAuthCookie(token)
>     return { id: user.id, username: user.username, role: user.role, balanceSats: user.balanceSats }
>   })
>
> // --- LOGOUT ---
> export const logoutUser = createServerFn({ method: 'POST' })
>   .handler(async () => {
>     clearAuthCookie()
>     return { success: true }
>   })
>
> // --- GET ME (fetch current user profile + balance) ---
> export const getMe = createServerFn({ method: 'GET' })
>   .handler(async () => {
>     const user = await requireAuth()
>     return {
>       id: user.id,
>       username: user.username,
>       email: user.email,
>       role: user.role,
>       balanceSats: user.balanceSats,
>     }
>   })
> ```
>
> Install `zod` if not already present (`npm install zod`). Do not create any route UI files yet.

---

## Prompt 4 — Video Server Functions

> **[AGENT TASK — P4: VIDEOS]**
>
> You are working inside a **TanStack Start full-stack monorepo** using `createServerFn` from `@tanstack/start` and **Prisma with PostgreSQL** via the singleton at `src/lib/db.ts`. Auth helpers are in `src/lib/auth.ts`. Do not create Express routes — all logic goes in server functions.
>
> Create the file **`src/server/videos.ts`** with the following four server functions:
>
> ```typescript
> import { createServerFn } from '@tanstack/start'
> import { db } from '../lib/db'
> import { requireAuth, requireRole } from '../lib/auth'
>
> // --- LIST ALL VIDEOS (public) ---
> // Returns all videos. The `url` field is never included here — only accessible
> // via getVideoAccess after a purchase is verified.
> export const listVideos = createServerFn({ method: 'GET' })
>   .handler(async () => {
>     const videos = await db.video.findMany({
>       include: { creator: { select: { username: true } } },
>       orderBy: { createdAt: 'desc' },
>     })
>     return videos.map((v) => ({
>       id: v.id,
>       title: v.title,
>       description: v.description,
>       priceSats: v.priceSats,
>       isFree: v.isFree,
>       courseId: v.courseId,
>       creatorUsername: v.creator.username,
>       createdAt: v.createdAt,
>     }))
>   })
>
> // --- GET SINGLE VIDEO METADATA (public) ---
> // Returns metadata only. Never exposes the video URL here.
> export const getVideoMeta = createServerFn({ method: 'GET' })
>   .validator((data: { videoId: string }) => data)
>   .handler(async ({ data }) => {
>     const video = await db.video.findUnique({
>       where: { id: data.videoId },
>       include: { creator: { select: { username: true } } },
>     })
>     if (!video) throw new Error('VIDEO_NOT_FOUND')
>     return {
>       id: video.id,
>       title: video.title,
>       description: video.description,
>       priceSats: video.priceSats,
>       isFree: video.isFree,
>       courseId: video.courseId,
>       creatorUsername: video.creator.username,
>       createdAt: video.createdAt,
>     }
>   })
>
> // --- CREATE VIDEO (CREATOR only) ---
> // For the hackathon, `url` is a string (a public CDN URL or a hardcoded local path).
> // File upload handling is out of scope — seed real URLs in the database.
> export const createVideo = createServerFn({ method: 'POST' })
>   .validator((data: {
>     title: string
>     description: string
>     url: string
>     priceSats: number
>     isFree: boolean
>     courseId: string
>   }) => data)
>   .handler(async ({ data }) => {
>     const creator = await requireRole('CREATOR')
>     const video = await db.video.create({
>       data: {
>         title: data.title,
>         description: data.description,
>         url: data.url,
>         priceSats: data.isFree ? 0 : data.priceSats,
>         isFree: data.isFree,
>         courseId: data.courseId,
>         creatorId: creator.id,
>       },
>     })
>     return { id: video.id, title: video.title }
>   })
>
> // --- GET VIDEO ACCESS (authenticated) ---
> // Returns the video URL only if:
> //   (a) the video is free (isFree === true), OR
> //   (b) the authenticated user has a settled Purchase for this video.
> // Returns { hasAccess: false } if neither condition is met.
> export const getVideoAccess = createServerFn({ method: 'GET' })
>   .validator((data: { videoId: string }) => data)
>   .handler(async ({ data }) => {
>     const user = await requireAuth()
>     const video = await db.video.findUnique({ where: { id: data.videoId } })
>     if (!video) throw new Error('VIDEO_NOT_FOUND')
>
>     if (video.isFree) {
>       return { hasAccess: true, videoUrl: video.url }
>     }
>
>     const purchase = await db.purchase.findFirst({
>       where: { userId: user.id, videoId: data.videoId, settled: true },
>     })
>
>     if (purchase) {
>       return { hasAccess: true, videoUrl: video.url }
>     }
>
>     return { hasAccess: false, videoUrl: null }
>   })
>
> // --- LIST CREATOR'S VIDEOS WITH PURCHASE COUNTS ---
> export const listMyVideos = createServerFn({ method: 'GET' })
>   .handler(async () => {
>     const creator = await requireRole('CREATOR')
>     const videos = await db.video.findMany({
>       where: { creatorId: creator.id },
>       include: { _count: { select: { purchases: { where: { settled: true } } } } },
>       orderBy: { createdAt: 'desc' },
>     })
>     return videos.map((v) => ({
>       id: v.id,
>       title: v.title,
>       priceSats: v.priceSats,
>       isFree: v.isFree,
>       purchaseCount: v._count.purchases,
>     }))
>   })
> ```

---

## Prompt 5 — Payment Server Functions (Invoice + Settlement + Revenue Split)

> **[AGENT TASK — P5: PAYMENTS]**
>
> You are working inside a **TanStack Start full-stack monorepo** using `createServerFn`. The LND REST client lives at `src/lib/lnd.ts`. The Prisma client singleton is at `src/lib/db.ts`. Auth helpers are at `src/lib/auth.ts`. Do not create Express routes.
>
> Create the file **`src/server/payments.ts`** with two server functions:
>
> ```typescript
> import { createServerFn } from '@tanstack/start'
> import { db } from '../lib/db'
> import { requireAuth } from '../lib/auth'
> import { lnd, b64ToHex } from '../lib/lnd'
>
> // --- PURCHASE VIDEO ---
> // Creates an LND invoice for the video price and saves a pending Purchase record.
> // Returns the payment_request (for QR display) and r_hash (for polling).
> export const purchaseVideo = createServerFn({ method: 'POST' })
>   .validator((data: { videoId: string }) => data)
>   .handler(async ({ data }) => {
>     const user = await requireAuth()
>     const video = await db.video.findUnique({ where: { id: data.videoId } })
>     if (!video) throw new Error('VIDEO_NOT_FOUND')
>     if (video.isFree) throw new Error('VIDEO_IS_FREE')
>
>     // Check if user already has a settled purchase for this video
>     const existing = await db.purchase.findFirst({
>       where: { userId: user.id, videoId: data.videoId, settled: true },
>     })
>     if (existing) throw new Error('ALREADY_PURCHASED')
>
>     // Create LND invoice
>     const { data: invoiceData } = await lnd.post('/v1/invoices', {
>       value: video.priceSats,
>       memo: `SatsLearn: ${video.title}`,
>       expiry: 600, // 10-minute expiry
>     })
>
>     // r_hash from LND is base64. Convert to hex for polling.
>     const rHashHex = b64ToHex(invoiceData.r_hash)
>
>     // Save pending purchase to DB
>     await db.purchase.create({
>       data: {
>         userId: user.id,
>         videoId: video.id,
>         paidSats: video.priceSats,
>         invoice: invoiceData.payment_request,
>         rHash: rHashHex,
>         settled: false,
>       },
>     })
>
>     return {
>       payment_request: invoiceData.payment_request,
>       r_hash: rHashHex,
>       amount_sats: video.priceSats,
>     }
>   })
>
> // --- CHECK INVOICE STATUS ---
> // The frontend polls this every 2 seconds after showing the QR code.
> // On settlement: applies the 90/10 revenue split and marks the purchase settled.
> // Revenue split:
> //   - Creator receives 90% of paidSats (credited to their custodial balanceSats)
> //   - Platform keeps 10% (no DB record needed for hackathon — just don't credit it)
> export const checkInvoiceStatus = createServerFn({ method: 'GET' })
>   .validator((data: { rHash: string }) => data)
>   .handler(async ({ data }) => {
>     // Look up the purchase by rHash
>     const purchase = await db.purchase.findFirst({
>       where: { rHash: data.rHash },
>       include: { video: { include: { creator: true } } },
>     })
>     if (!purchase) throw new Error('PURCHASE_NOT_FOUND')
>
>     // If already settled in our DB, just return success immediately
>     if (purchase.settled) {
>       return { settled: true, videoUrl: purchase.video.url }
>     }
>
>     // Poll LND for settlement status
>     const { data: invoiceData } = await lnd.get(`/v1/invoice/${data.rHash}`)
>
>     if (invoiceData.settled) {
>       const total = purchase.paidSats
>       const creatorCut = Math.floor(total * 0.9)  // 90% to creator
>       // platformCut = total - creatorCut          // 10% stays in node (not credited)
>
>       // Use a Prisma transaction to atomically: credit creator + mark settled
>       await db.$transaction([
>         db.user.update({
>           where: { id: purchase.video.creatorId },
>           data: { balanceSats: { increment: creatorCut } },
>         }),
>         db.purchase.update({
>           where: { id: purchase.id },
>           data: { settled: true },
>         }),
>       ])
>
>       return { settled: true, videoUrl: purchase.video.url }
>     }
>
>     return { settled: false, videoUrl: null }
>   })
> ```

---

## Prompt 6 — Ads Engine Server Functions

> **[AGENT TASK — P6: ADS ENGINE]**
>
> You are working inside a **TanStack Start full-stack monorepo** using `createServerFn` from `@tanstack/start` and **Prisma with PostgreSQL** via `src/lib/db.ts`. Auth helpers are in `src/lib/auth.ts`. Do not create Express routes.
>
> Create the file **`src/server/ads.ts`** with the following server functions:
>
> **Ad Revenue Split:** When a user watches an ad, they receive 60% of `rewardSats`. The platform keeps the remaining 40% (30% platform + 10% reserve per the plan). For the hackathon, only the user's 60% share is credited as a DB balance increment — the rest stays in the ad's `spentSats` count.
>
> ```typescript
> import { createServerFn } from '@tanstack/start'
> import { db } from '../lib/db'
> import { requireAuth, requireRole } from '../lib/auth'
>
> // --- CREATE AD (ADVERTISER only) ---
> // Budget deposit is simulated for the hackathon — no LND invoice for ad budget.
> export const createAd = createServerFn({ method: 'POST' })
>   .validator((data: {
>     title: string
>     videoUrl: string
>     budgetSats: number
>     rewardSats: number
>   }) => data)
>   .handler(async ({ data }) => {
>     await requireRole('ADVERTISER')
>     const ad = await db.ad.create({
>       data: {
>         title: data.title,
>         videoUrl: data.videoUrl,
>         budgetSats: data.budgetSats,
>         rewardSats: data.rewardSats,
>         spentSats: 0,
>         active: true,
>       },
>     })
>     return { id: ad.id, title: ad.title }
>   })
>
> // --- GET NEXT AD ---
> // Returns a random active Ad that still has remaining budget.
> // An ad has remaining budget when: spentSats + rewardSats <= budgetSats
> // Returns null if no ads are available (frontend should show "check back soon").
> export const getNextAd = createServerFn({ method: 'GET' })
>   .handler(async () => {
>     const ads = await db.ad.findMany({
>       where: {
>         active: true,
>         // Filter where budget has not been exhausted
>         // spentSats + rewardSats <= budgetSats means:
>         // spentSats <= budgetSats - rewardSats
>         // Prisma doesn't support column-to-column comparison natively, use raw or filter post-query
>       },
>     })
>
>     // Filter in JS: only ads with remaining budget
>     const available = ads.filter((ad) => ad.spentSats + ad.rewardSats <= ad.budgetSats)
>     if (available.length === 0) return null
>
>     // Pick a random ad from the available pool
>     const ad = available[Math.floor(Math.random() * available.length)]
>     return {
>       id: ad.id,
>       title: ad.title,
>       videoUrl: ad.videoUrl,
>       rewardSats: ad.rewardSats,
>     }
>   })
>
> // --- MARK AD WATCHED ---
> // Called by the frontend after the video's `ended` event fires.
> // Rules:
> //   1. User must not have watched this specific ad in the last 24 hours (cooldown).
> //   2. Ad must have remaining budget.
> //   3. Credits user 60% of rewardSats, increments ad.spentSats by rewardSats.
> //   4. Creates an AdWatch record for history + cooldown tracking.
> export const markAdWatched = createServerFn({ method: 'POST' })
>   .validator((data: { adId: string }) => data)
>   .handler(async ({ data }) => {
>     const user = await requireAuth()
>     const ad = await db.ad.findUnique({ where: { id: data.adId } })
>     if (!ad || !ad.active) throw new Error('AD_NOT_FOUND')
>
>     // Check budget remaining
>     if (ad.spentSats + ad.rewardSats > ad.budgetSats) {
>       throw new Error('AD_BUDGET_EXHAUSTED')
>     }
>
>     // 24-hour cooldown check
>     const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
>     const recentWatch = await db.adWatch.findFirst({
>       where: {
>         userId: user.id,
>         adId: data.adId,
>         watchedAt: { gte: oneDayAgo },
>       },
>     })
>     if (recentWatch) throw new Error('COOLDOWN_ACTIVE')
>
>     // User earns 60% of rewardSats
>     const userEarned = Math.floor(ad.rewardSats * 0.6)
>
>     // Atomic transaction: create watch record + credit user + increment ad spend
>     await db.$transaction([
>       db.adWatch.create({
>         data: { userId: user.id, adId: ad.id, earnedSats: userEarned },
>       }),
>       db.user.update({
>         where: { id: user.id },
>         data: { balanceSats: { increment: userEarned } },
>       }),
>       db.ad.update({
>         where: { id: ad.id },
>         data: { spentSats: { increment: ad.rewardSats } },
>       }),
>     ])
>
>     const updatedUser = await db.user.findUnique({ where: { id: user.id } })
>     return {
>       earned: userEarned,
>       newBalance: updatedUser!.balanceSats,
>     }
>   })
>
> // --- GET USER AD WATCH HISTORY ---
> export const getAdWatchHistory = createServerFn({ method: 'GET' })
>   .handler(async () => {
>     const user = await requireAuth()
>     const history = await db.adWatch.findMany({
>       where: { userId: user.id },
>       include: { ad: { select: { title: true } } },
>       orderBy: { watchedAt: 'desc' },
>       take: 20,
>     })
>     return history.map((w) => ({
>       id: w.id,
>       adTitle: w.ad.title,
>       earnedSats: w.earnedSats,
>       watchedAt: w.watchedAt,
>     }))
>   })
> ```

---

## Prompt 7 — Wallet Server Functions

> **[AGENT TASK — P7: WALLET]**
>
> You are working inside a **TanStack Start full-stack monorepo** using `createServerFn` from `@tanstack/start`. The LND client is at `src/lib/lnd.ts`. The Prisma singleton is at `src/lib/db.ts`. Auth helpers are at `src/lib/auth.ts`.
>
> Create the file **`src/server/wallet.ts`**. This file handles balance reads and creator withdrawals via LND `POST /v1/channels/transactions`.
>
> **Critical withdrawal safety rule:** Always deduct the balance from the database *first* (inside a transaction) before calling the LND payment API. This prevents double-spend if the LND call fails — the creator's balance is already decremented and they would need to contact support. For a hackathon this is the safer failure mode vs. paying twice.
>
> ```typescript
> import { createServerFn } from '@tanstack/start'
> import { db } from '../lib/db'
> import { requireAuth } from '../lib/auth'
> import { lnd } from '../lib/lnd'
>
> // --- GET BALANCE ---
> export const getBalance = createServerFn({ method: 'GET' })
>   .handler(async () => {
>     const user = await requireAuth()
>     return {
>       balanceSats: user.balanceSats,
>       // 1 sat ≈ $0.00065 hardcoded for the demo
>       approximateUSD: (user.balanceSats * 0.00065).toFixed(2),
>     }
>   })
>
> // --- WITHDRAW FUNDS (CREATOR only) ---
> // Creator submits a BOLT11 payment_request from their personal Lightning wallet.
> // Backend: deducts balance → sends LND payment → returns payment_hash.
> export const withdrawFunds = createServerFn({ method: 'POST' })
>   .validator((data: { payment_request: string; amount_sats: number }) => data)
>   .handler(async ({ data }) => {
>     const user = await requireAuth()
>
>     if (user.balanceSats < data.amount_sats) {
>       throw new Error('INSUFFICIENT_BALANCE')
>     }
>
>     // Step 1: Deduct balance atomically BEFORE calling LND
>     await db.user.update({
>       where: { id: user.id },
>       data: { balanceSats: { decrement: data.amount_sats } },
>     })
>
>     try {
>       // Step 2: Send the payment via LND
>       // For exact-amount invoices, omit the `amt` field.
>       // For zero-amount invoices, pass `amt: data.amount_sats`.
>       const { data: paymentData } = await lnd.post('/v1/channels/transactions', {
>         payment_request: data.payment_request,
>         // amt: data.amount_sats, // uncomment for zero-amount invoices
>       })
>
>       return {
>         success: true,
>         payment_hash: paymentData.payment_hash,
>         amount_sats: data.amount_sats,
>       }
>     } catch (lndError) {
>       // If LND fails, attempt to refund the balance.
>       // In production, this would be handled more carefully.
>       await db.user.update({
>         where: { id: user.id },
>         data: { balanceSats: { increment: data.amount_sats } },
>       })
>       throw new Error('LND_PAYMENT_FAILED')
>     }
>   })
> ```

---

## Prompt 8 — Database Seed Script

> **[AGENT TASK — P8: SEED DATA]**
>
> You are working inside a **TanStack Start full-stack monorepo** with **Prisma + PostgreSQL**. The schema has 5 models: `User`, `Video`, `Purchase`, `Ad`, `AdWatch`. Create realistic seed data for the hackathon demo.
>
> Create the file **`prisma/seed.ts`**:
>
> ```typescript
> import { PrismaClient } from '@prisma/client'
> import bcrypt from 'bcryptjs'
>
> const prisma = new PrismaClient()
>
> async function main() {
>   console.log('Seeding SatsLearn database...')
>
>   // Clear existing data (order matters for FK constraints)
>   await prisma.adWatch.deleteMany()
>   await prisma.purchase.deleteMany()
>   await prisma.ad.deleteMany()
>   await prisma.video.deleteMany()
>   await prisma.user.deleteMany()
>
>   const password = await bcrypt.hash('password123', 10)
>
>   // --- USERS ---
>   const learner = await prisma.user.create({
>     data: { email: 'learner@test.com', username: 'satoshi_student', password, role: 'LEARNER', balanceSats: 500 },
>   })
>   const creator = await prisma.user.create({
>     data: { email: 'creator@test.com', username: 'lightning_teacher', password, role: 'CREATOR', balanceSats: 1200 },
>   })
>   const advertiser = await prisma.user.create({
>     data: { email: 'advertiser@test.com', username: 'btc_advertiser', password, role: 'ADVERTISER', balanceSats: 0 },
>   })
>
>   // --- VIDEOS ---
>   // Use a real public MP4 for the demo. Replace these URLs with your local files if needed.
>   const freeSample = await prisma.video.create({
>     data: {
>       title: 'What is the Lightning Network? (Free Preview)',
>       description: 'A beginner-friendly overview of Bitcoin\'s Layer 2 payment network.',
>       url: 'https://www.w3schools.com/html/mov_bbb.mp4', // replace with real content
>       priceSats: 0,
>       isFree: true,
>       courseId: 'course-lightning-basics',
>       creatorId: creator.id,
>     },
>   })
>
>   const paidVideo1 = await prisma.video.create({
>     data: {
>       title: 'Setting Up a Lightning Node with Polar',
>       description: 'Step-by-step guide to running your own Lightning node locally.',
>       url: 'https://www.w3schools.com/html/mov_bbb.mp4', // replace with real content
>       priceSats: 100,
>       isFree: false,
>       courseId: 'course-lightning-basics',
>       creatorId: creator.id,
>     },
>   })
>
>   const paidVideo2 = await prisma.video.create({
>     data: {
>       title: 'Building BOLT11 Invoice Integrations',
>       description: 'Code along as we integrate LND REST API into a real web app.',
>       url: 'https://www.w3schools.com/html/mov_bbb.mp4', // replace with real content
>       priceSats: 200,
>       isFree: false,
>       courseId: 'course-lightning-dev',
>       creatorId: creator.id,
>     },
>   })
>
>   // --- ADS ---
>   await prisma.ad.create({
>     data: {
>       title: 'Stack Sats with Bitrefill — Pay Bills with Bitcoin',
>       videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', // replace with real ad
>       budgetSats: 10000,
>       rewardSats: 50, // user earns 60% = 30 sats per view
>       spentSats: 0,
>       active: true,
>     },
>   })
>
>   console.log('✅ Seeded:')
>   console.log(`   3 users (learner@test.com, creator@test.com, advertiser@test.com) — password: password123`)
>   console.log(`   3 videos (1 free, 2 paid at 100 and 200 sats)`)
>   console.log(`   1 ad (10,000 sat budget, 50 sat reward, user earns 30 sats per view)`)
> }
>
> main()
>   .catch((e) => { console.error(e); process.exit(1) })
>   .finally(async () => { await prisma.$disconnect() })
> ```
>
> Then add this to `package.json`:
> ```json
> "prisma": {
>   "seed": "tsx prisma/seed.ts"
> }
> ```
>
> Install `tsx` if needed (`npm install -D tsx`), then run `npx prisma db seed`.

---

## Prompt 9 — App Shell: Root Layout, Auth Context, Navbar, Login & Register

> **[AGENT TASK — P9: APP SHELL]**
>
> You are building the React frontend of a **TanStack Start full-stack app** using `@tanstack/react-router`. The server functions for auth are in `src/server/auth.ts`. Do not use a separate API client — call server functions directly from React components.
>
> **Design tokens** (from the original plan): background `#0a0a0f`, cards `#111118`, accent gold `#F7B500`, purple accent `#8B5CF6`, teal `#14B8A6`. Use Tailwind utility classes. Dark theme throughout.
>
> **Step 1 — Create `src/context/auth.tsx`** — an AuthContext that stores the current user:
>
> ```tsx
> import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
> import { getMe } from '../server/auth'
>
> type User = { id: string; username: string; email: string; role: string; balanceSats: number }
>
> type AuthContextType = {
>   user: User | null
>   setUser: (user: User | null) => void
>   isLoading: boolean
>   refreshUser: () => Promise<void>
> }
>
> const AuthContext = createContext<AuthContextType | null>(null)
>
> export function AuthProvider({ children }: { children: ReactNode }) {
>   const [user, setUser] = useState<User | null>(null)
>   const [isLoading, setIsLoading] = useState(true)
>
>   const refreshUser = async () => {
>     try {
>       const me = await getMe()
>       setUser(me)
>     } catch {
>       setUser(null)
>     }
>   }
>
>   useEffect(() => {
>     refreshUser().finally(() => setIsLoading(false))
>   }, [])
>
>   return (
>     <AuthContext.Provider value={{ user, setUser, isLoading, refreshUser }}>
>       {children}
>     </AuthContext.Provider>
>   )
> }
>
> export function useAuth() {
>   const ctx = useContext(AuthContext)
>   if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
>   return ctx
> }
> ```
>
> **Step 2 — Create `src/components/Navbar.tsx`**:
> - SatsLearn logo: `⚡ SatsLearn` in gold (`#F7B500`)
> - Nav links: Home (`/`), Earn (`/earn`), Dashboard (`/dashboard`, visible only to CREATORs), Wallet (`/wallet`)
> - Right side: if logged in, show `⚡ {balanceSats} sats` in gold + a Logout button. If logged out, show Login and Register links.
> - On logout: call `logoutUser()` from `src/server/auth.ts`, then call `setUser(null)` from context, then navigate to `/login`.
> - Style: `bg-[#111118]` background, `border-b border-white/10`, `text-[#f0f0f0]`.
>
> **Step 3 — Update `src/routes/__root.tsx`**: Wrap the outlet with `<AuthProvider>` and render `<Navbar />` above it.
>
> **Step 4 — Create `src/routes/register.tsx`** (`createFileRoute('/register')`):
> - Form with fields: email, username, password, role (dropdown: Learner / Creator / Advertiser).
> - On submit: call `registerUser({ data: { email, username, password, role } })` from `src/server/auth.ts`.
> - On success: call `refreshUser()` from context, navigate to `/`.
> - Show a user-friendly error message if `EMAIL_OR_USERNAME_TAKEN` is thrown.
> - Style: centered card, dark background, gold submit button (`bg-[#F7B500] text-black`).
>
> **Step 5 — Create `src/routes/login.tsx`** (`createFileRoute('/login')`):
> - Form with fields: email, password.
> - On submit: call `loginUser({ data: { email, password } })`.
> - On success: call `refreshUser()`, navigate to `/`.
> - Show "Invalid email or password" for `INVALID_CREDENTIALS` error.
> - Include a link to `/register`.

---

## Prompt 10 — Course Browser & Video Player with Paywall

> **[AGENT TASK — P10: COURSE BROWSER + PAYWALL]**
>
> You are building the React frontend of a **TanStack Start full-stack app**. Server functions live in `src/server/videos.ts` and `src/server/payments.ts`. Install `qrcode.react` (`npm install qrcode.react`) for QR code rendering.
>
> **Step 1 — Update `src/routes/index.tsx`** (`createFileRoute('/')`):
> - On mount, call `listVideos()` from `src/server/videos.ts`.
> - Display videos in a responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`).
> - Each **video card** shows:
>   - Video title (bold, white)
>   - Creator username (`text-gray-400`, small)
>   - Price badge: if `isFree`, show `FREE` badge in green (`bg-green-500/20 text-green-400`); otherwise show `⚡ {priceSats} sats` in gold.
>   - A grey placeholder thumbnail area (`bg-[#16161f] h-36 rounded-lg`)
>   - Entire card is clickable → navigate to `/learn/{video.id}`
> - Card style: `bg-[#111118] border border-white/10 rounded-xl p-4 hover:border-yellow-500/40 transition-colors cursor-pointer`
>
> **Step 2 — Create `src/routes/learn.$videoId.tsx`** (`createFileRoute('/learn/$videoId')`):
>
> The component has two states: **access granted** (show video player) and **paywall** (show invoice QR).
>
> ```
> On mount:
>   1. Call getVideoMeta({ data: { videoId } }) to get title, price, isFree.
>   2. Call getVideoAccess({ data: { videoId } }) to check if user already has access.
>   3. If hasAccess === true → render HTML5 <video> element with the returned videoUrl.
>   4. If hasAccess === false → render the paywall overlay.
>
> Paywall overlay:
>   - Show video title, price in sats
>   - "Unlock for ⚡ X sats" button
>   - On click: call purchaseVideo({ data: { videoId } }) → receive { payment_request, r_hash, amount_sats }
>   - Display the payment_request as a QR code using <QRCodeSVG value={payment_request} size={220} />
>     from 'qrcode.react'
>   - Display the payment_request as copyable text (truncated, with a "Copy" button using navigator.clipboard)
>   - Start polling: every 2 seconds, call checkInvoiceStatus({ data: { rHash: r_hash } })
>   - When { settled: true } is returned: stop polling, show "✅ Payment confirmed! Loading video..." message,
>     then load the videoUrl into an <video> element.
>   - Show a countdown or "Waiting for payment..." spinner while polling.
>
> Polling implementation (use useEffect + useRef for interval):
>   const intervalRef = useRef<NodeJS.Timeout | null>(null)
>   // Start polling after invoice is created
>   // Clear interval when settled or component unmounts
> ```
>
> Style: full dark background, gold accents for price and QR border. QR code container: `bg-white p-3 rounded-lg inline-block`.

---

## Prompt 11 — Earn Page (Ad Watching)

> **[AGENT TASK — P11: EARN PAGE]**
>
> You are building the React frontend of a **TanStack Start full-stack app**. Ad server functions are in `src/server/ads.ts`. Auth context is in `src/context/auth.tsx`.
>
> Create **`src/routes/earn.tsx`** (`createFileRoute('/earn')`). This page is the "get paid to watch ads" experience.
>
> **Full component spec:**
>
> ```
> State:
>   - currentAd: Ad | null (fetched on mount)
>   - videoEnded: boolean (tracks if ad video has played to completion)
>   - claiming: boolean (button loading state)
>   - sessionEarned: number (running total for this session, starts at 0)
>   - notification: { message: string, sats: number } | null (the +X sats flash)
>
> On mount: call getNextAd() from src/server/ads.ts
>   - If null → show "No ads right now, check back soon ☕" empty state with a refresh button.
>   - If ad returned → set currentAd, reset videoEnded to false.
>
> Layout (top to bottom):
>   1. Session earnings counter: "Earned this session: ⚡ {sessionEarned} sats" — large, gold, top of page
>   2. Heading: "Earn sats for your attention"
>   3. Ad title (large text)
>   4. Video player:
>        <video
>          src={currentAd.videoUrl}
>          controlsList="nodownload nofullscreen noremoteplayback"
>          disablePictureInPicture
>          onEnded={() => setVideoEnded(true)}
>          onTimeUpdate={(e) => setProgress((e.target.currentTime / e.target.duration) * 100)}
>          className="w-full rounded-lg"
>        />
>        Hide the timeline/scrubber with CSS: video::-webkit-media-controls-timeline { display: none }
>   5. Progress bar: a div that fills from 0% to 100% based on video playback (gold fill).
>   6. "Claim ⚡ {rewardSats} sats" button:
>        - Disabled (gray) until videoEnded === true
>        - On click: set claiming = true, call markAdWatched({ data: { adId: currentAd.id } })
>        - On success: add earned sats to sessionEarned, call refreshUser() from auth context
>          to update navbar balance, show notification ("+{earned} sats" flash in gold for 2s)
>        - After 3 seconds: call getNextAd() again and reset UI for next ad
>        - If COOLDOWN_ACTIVE error: show "You already watched this ad recently" message
>
> The +X sats notification: absolute positioned, animated from opacity-0 to opacity-100 then fade out,
> gold color, large font. Use a CSS transition or simple setTimeout.
>
> Style: bg-[#0a0a0f], progress bar bg-[#F7B500], claim button bg-[#F7B500] text-black font-bold
> when active, bg-gray-700 cursor-not-allowed when disabled.
> ```

---

## Prompt 12 — Creator Dashboard & Wallet Page

> **[AGENT TASK — P12: CREATOR DASHBOARD + WALLET]**
>
> You are building the React frontend of a **TanStack Start full-stack app**. Server functions are in `src/server/videos.ts`, `src/server/wallet.ts`, and `src/server/ads.ts`. Auth context is in `src/context/auth.tsx`.
>
> **Step 1 — Create `src/routes/dashboard.tsx`** (`createFileRoute('/dashboard')`):
>
> ```
> Redirect non-CREATORs: if user.role !== 'CREATOR', redirect to '/'.
>
> On mount: call getBalance() and listMyVideos() in parallel (Promise.all).
>
> Display (top to bottom):
>   1. Stats bar:
>      - Total balance: large number in gold, e.g. "⚡ 1,200 sats"  |  "~$0.78 USD"
>      - Total videos uploaded: count from listMyVideos()
>      - Total settled purchases: sum of purchaseCount across all videos
>
>   2. Upload Video form:
>      Fields:
>        - title (text input)
>        - description (textarea)
>        - videoUrl (text input, labeled "Video URL — paste a CDN link or local path")
>        - priceSats (number input, disabled if isFree is checked)
>        - isFree (checkbox: "This is the free sample for the course")
>        - courseId (text input, labeled "Course ID — e.g. course-lightning-basics")
>      On submit: call createVideo({ data: { title, description, url: videoUrl, priceSats, isFree, courseId } })
>      On success: show "Video published!" toast, refetch listMyVideos().
>      Style: bg-[#111118] card, gold submit button.
>
>   3. My Videos list:
>      Each row: video title | price badge | purchase count (e.g. "3 purchases")
>      Style: simple table or list with border-bottom dividers.
> ```
>
> **Step 2 — Create `src/routes/wallet.tsx`** (`createFileRoute('/wallet')`):
>
> ```
> On mount: call getBalance() and getAdWatchHistory() in parallel.
>
> Display (top to bottom):
>   1. Balance card:
>      - "⚡ {balanceSats} sats" — very large, gold
>      - "≈ ${approximateUSD} USD" — small, gray
>      - Note: "1 sat ≈ $0.00065 (demo rate)"
>
>   2. Withdraw form:
>      Fields:
>        - payment_request (textarea, labeled "Your Lightning Invoice (BOLT11)")
>          — placeholder: "lnbc1..."
>        - amount_sats (number input, labeled "Amount to withdraw (sats)")
>      On submit: call withdrawFunds({ data: { payment_request, amount_sats } })
>      On success: show a confirmation card:
>        "✅ Sent! Payment hash: {payment_hash}"
>        in green, monospace font, truncated with copy button.
>      If INSUFFICIENT_BALANCE error: show "Insufficient balance" in red.
>      If LND_PAYMENT_FAILED error: show "Payment failed — your balance has been restored." in red.
>
>   3. Earnings History (Ad Watches):
>      Show the last 20 AdWatch records from getAdWatchHistory().
>      Each row: ad title | "+{earnedSats} sats" in gold | date (formatted as "Jun 12, 10:42 AM")
>      If empty: show "No ad earnings yet — visit the Earn page!"
>
> Style: consistent dark theme, bg-[#111118] cards, gold accents, monospace for payment hash.
> ```

---

## Quick Reference: File Map

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | 5-model Prisma schema |
| `prisma/seed.ts` | 3 users, 3 videos, 1 ad |
| `src/lib/db.ts` | Prisma singleton |
| `src/lib/lnd.ts` | LND REST axios client + b64ToHex |
| `src/lib/auth.ts` | JWT sign/verify, cookie helpers, requireAuth/requireRole |
| `src/server/auth.ts` | registerUser, loginUser, logoutUser, getMe |
| `src/server/videos.ts` | listVideos, getVideoMeta, createVideo, getVideoAccess, listMyVideos |
| `src/server/payments.ts` | purchaseVideo, checkInvoiceStatus (with 90/10 revenue split) |
| `src/server/ads.ts` | createAd, getNextAd, markAdWatched, getAdWatchHistory |
| `src/server/wallet.ts` | getBalance, withdrawFunds |
| `src/context/auth.tsx` | React AuthContext + useAuth hook |
| `src/components/Navbar.tsx` | Navigation with live balance display |
| `src/routes/__root.tsx` | Root layout (AuthProvider + Navbar) |
| `src/routes/index.tsx` | Course browser grid |
| `src/routes/login.tsx` | Login form |
| `src/routes/register.tsx` | Register form with role selection |
| `src/routes/learn.$videoId.tsx` | Video player + paywall + QR + polling |
| `src/routes/earn.tsx` | Ad watching + claim sats |
| `src/routes/dashboard.tsx` | Creator stats + video upload |
| `src/routes/wallet.tsx` | Balance + withdrawal + ad history |

## Scope Cuts (if behind on time)

| Cut | Replace with | Time saved |
|-----|-------------|------------|
| Video upload form | Hardcode video URLs in seed only | ~25 min |
| Creator dashboard | Show `balanceSats` via `getMe()` in browser console | ~25 min |
| 24h ad cooldown | Remove the `recentWatch` check in `markAdWatched` | ~10 min |
| Withdrawal flow | Comment out LND call, return a mock payment_hash | ~15 min |
| Register page | Use pre-seeded accounts, demo with login only | ~20 min |
