import { createServerFn } from "@tanstack/react-start";
import { db } from "../lib/db.server";
import { requireAuth, requireRole } from "../lib/auth.server";
import { createVideoSchema, videoIdSchema } from "../lib/schemas";

// --- LIST ALL VIDEOS (public) ---
// Returns all videos. The `url` field is never included here — only accessible
// via getVideoAccess after a purchase is verified.
export const listVideos = createServerFn({ method: "GET" }).handler(async () => {
  const videos = await db.video.findMany({
    include: { creator: { select: { username: true } } },
    orderBy: { createdAt: "desc" },
  });
  return videos.map((v) => ({
    id: v.id,
    title: v.title,
    description: v.description,
    priceSats: v.priceSats,
    isFree: v.isFree,
    courseId: v.courseId,
    creatorUsername: v.creator.username,
    createdAt: v.createdAt.toISOString(),
  }));
});

// --- GET SINGLE VIDEO METADATA (public) ---
// Returns metadata only. Never exposes the video URL here.
export const getVideoMeta = createServerFn({ method: "GET" })
  .validator(videoIdSchema)
  .handler(async ({ data }) => {
    const video = await db.video.findUnique({
      where: { id: data.videoId },
      include: { creator: { select: { username: true } } },
    });
    if (!video) throw new Error("VIDEO_NOT_FOUND");
    return {
      id: video.id,
      title: video.title,
      description: video.description,
      priceSats: video.priceSats,
      isFree: video.isFree,
      courseId: video.courseId,
      creatorUsername: video.creator.username,
      createdAt: video.createdAt.toISOString(),
    };
  });

// --- CREATE VIDEO (CREATOR only) ---
// For the hackathon, `url` is a string (a public CDN URL or a hardcoded local path).
// File upload handling is out of scope — seed real URLs in the database.
export const createVideo = createServerFn({ method: "POST" })
  .validator(createVideoSchema)
  .handler(async ({ data }) => {
    const creator = await requireRole("CREATOR");
    const video = await db.video.create({
      data: {
        title: data.title,
        description: data.description,
        url: data.url,
        priceSats: data.isFree ? 0 : data.priceSats,
        isFree: data.isFree,
        courseId: data.courseId,
        creatorId: creator.id,
      },
    });
    return { id: video.id, title: video.title };
  });

// --- GET VIDEO ACCESS (authenticated) ---
// Returns the video URL only if:
//   (a) the video is free (isFree === true), OR
//   (b) the authenticated user has a settled Purchase for this video.
// Returns { hasAccess: false } if neither condition is met.
export const getVideoAccess = createServerFn({ method: "GET" })
  .validator(videoIdSchema)
  .handler(async ({ data }) => {
    const video = await db.video.findUnique({ where: { id: data.videoId } });
    if (!video) throw new Error("VIDEO_NOT_FOUND");

    if (video.isFree) {
      return { hasAccess: true, videoUrl: video.url };
    }

    const user = await requireAuth();
    const purchase = await db.purchase.findFirst({
      where: { userId: user.id, videoId: data.videoId, settled: true },
    });

    if (purchase) {
      return { hasAccess: true, videoUrl: video.url };
    }

    return { hasAccess: false, videoUrl: null };
  });

// --- LIST CREATOR'S VIDEOS WITH PURCHASE COUNTS ---
export const listMyVideos = createServerFn({ method: "GET" }).handler(async () => {
  const creator = await requireRole("CREATOR");
  const videos = await db.video.findMany({
    where: { creatorId: creator.id },
    include: { _count: { select: { purchases: { where: { settled: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return videos.map((v) => ({
    id: v.id,
    title: v.title,
    priceSats: v.priceSats,
    isFree: v.isFree,
    purchaseCount: v._count.purchases,
  }));
});
