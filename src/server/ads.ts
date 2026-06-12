import { createServerFn } from "@tanstack/react-start";
import { db } from "../lib/db";
import { requireAuth, requireRole } from "../lib/auth";

// --- CREATE AD (ADVERTISER only) ---
// Budget deposit is simulated for the hackathon — no LND invoice for ad budget.
export const createAd = createServerFn({ method: "POST" })
  .validator(
    (data: { title: string; videoUrl: string; budgetSats: number; rewardSats: number }) => data,
  )
  .handler(
    async ({
      data,
    }: {
      data: { title: string; videoUrl: string; budgetSats: number; rewardSats: number };
    }) => {
      await requireRole("ADVERTISER");
      const ad = await db.ad.create({
        data: {
          title: data.title,
          videoUrl: data.videoUrl,
          budgetSats: data.budgetSats,
          rewardSats: data.rewardSats,
          spentSats: 0,
          active: true,
        },
      });
      return { id: ad.id, title: ad.title };
    },
  );

// --- GET NEXT AD ---
// Returns a random active Ad that still has remaining budget.
// An ad has remaining budget when: spentSats + rewardSats <= budgetSats
// Returns null if no ads are available (frontend should show "check back soon").
export const getNextAd = createServerFn({ method: "GET" }).handler(async () => {
  const ads = await db.ad.findMany({
    where: {
      active: true,
      // Filter where budget has not been exhausted
      // spentSats + rewardSats <= budgetSats means:
      // spentSats <= budgetSats - rewardSats
      // Prisma doesn't support column-to-column comparison natively, use raw or filter post-query
    },
  });

  // Filter in JS: only ads with remaining budget
  const available = ads.filter((ad) => ad.spentSats + ad.rewardSats <= ad.budgetSats);
  if (available.length === 0) return null;

  // Pick a random ad from the available pool
  const ad = available[Math.floor(Math.random() * available.length)];
  return {
    id: ad.id,
    title: ad.title,
    videoUrl: ad.videoUrl,
    rewardSats: ad.rewardSats,
  };
});

// --- MARK AD WATCHED ---
// Called by the frontend after the video's `ended` event fires.
// Rules:
//   1. User must not have watched this specific ad in the last 24 hours (cooldown).
//   2. Ad must have remaining budget.
//   3. Credits user 60% of rewardSats, increments ad.spentSats by rewardSats.
//   4. Creates an AdWatch record for history + cooldown tracking.
export const markAdWatched = createServerFn({ method: "POST" })
  .validator((data: { adId: string }) => data)
  .handler(async ({ data }: { data: { adId: string } }) => {
    const user = await requireAuth();
    const ad = await db.ad.findUnique({ where: { id: data.adId } });
    if (!ad || !ad.active) throw new Error("AD_NOT_FOUND");

    // Check budget remaining
    if (ad.spentSats + ad.rewardSats > ad.budgetSats) {
      throw new Error("AD_BUDGET_EXHAUSTED");
    }

    // 24-hour cooldown check
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentWatch = await db.adWatch.findFirst({
      where: {
        userId: user.id,
        adId: data.adId,
        watchedAt: { gte: oneDayAgo },
      },
    });
    if (recentWatch) throw new Error("COOLDOWN_ACTIVE");

    // User earns 60% of rewardSats
    const userEarned = Math.floor(ad.rewardSats * 0.6);

    // Atomic transaction: create watch record + credit user + increment ad spend
    await db.$transaction([
      db.adWatch.create({
        data: { userId: user.id, adId: ad.id, earnedSats: userEarned },
      }),
      db.user.update({
        where: { id: user.id },
        data: { balanceSats: { increment: userEarned } },
      }),
      db.ad.update({
        where: { id: ad.id },
        data: { spentSats: { increment: ad.rewardSats } },
      }),
    ]);

    const updatedUser = await db.user.findUnique({ where: { id: user.id } });
    return {
      earned: userEarned,
      newBalance: updatedUser!.balanceSats,
    };
  });

// --- GET USER AD WATCH HISTORY ---
export const getAdWatchHistory = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireAuth();
  const history = await db.adWatch.findMany({
    where: { userId: user.id },
    include: { ad: { select: { title: true } } },
    orderBy: { watchedAt: "desc" },
    take: 20,
  });
  return history.map((w) => ({
    id: w.id,
    adTitle: w.ad.title,
    earnedSats: w.earnedSats,
    watchedAt: w.watchedAt,
  }));
});
