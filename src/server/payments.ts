import { createServerFn } from "@tanstack/react-start";
import { db } from "../lib/db";
import { requireAuth } from "../lib/auth";
import { lnd, b64ToHex } from "../lib/lnd";

// --- PURCHASE VIDEO ---
// Creates an LND invoice for the video price and saves a pending Purchase record.
// Returns the payment_request (for QR display) and r_hash (for polling).
export const purchaseVideo = createServerFn({ method: "POST" })
  .validator((data: { videoId: string }) => data)
  .handler(async ({ data }: { data: { videoId: string } }) => {
    const user = await requireAuth();
    const video = await db.video.findUnique({ where: { id: data.videoId } });
    if (!video) throw new Error("VIDEO_NOT_FOUND");
    if (video.isFree) throw new Error("VIDEO_IS_FREE");

    // Check if user already has a settled purchase for this video
    const existing = await db.purchase.findFirst({
      where: { userId: user.id, videoId: data.videoId, settled: true },
    });
    if (existing) throw new Error("ALREADY_PURCHASED");

    // Create LND invoice
    const { data: invoiceData } = await lnd.post("/v1/invoices", {
      value: video.priceSats,
      memo: `SatsLearn: ${video.title}`,
      expiry: 600, // 10-minute expiry
    });

    // r_hash from LND is base64. Convert to hex for polling.
    const rHashHex = b64ToHex(invoiceData.r_hash);

    // Save pending purchase to DB
    await db.purchase.create({
      data: {
        userId: user.id,
        videoId: video.id,
        paidSats: video.priceSats,
        invoice: invoiceData.payment_request,
        rHash: rHashHex,
        settled: false,
      },
    });

    return {
      payment_request: invoiceData.payment_request,
      r_hash: rHashHex,
      amount_sats: video.priceSats,
    };
  });

// --- CHECK INVOICE STATUS ---
// The frontend polls this every 2 seconds after showing the QR code.
// On settlement: applies the 90/10 revenue split and marks the purchase settled.
// Revenue split:
//   - Creator receives 90% of paidSats (credited to their custodial balanceSats)
//   - Platform keeps 10% (no DB record needed for hackathon — just don't credit it)
export const checkInvoiceStatus = createServerFn({ method: "GET" })
  .validator((data: { rHash: string }) => data)
  .handler(async ({ data }: { data: { rHash: string } }) => {
    // Look up the purchase by rHash
    const purchase = await db.purchase.findFirst({
      where: { rHash: data.rHash },
      include: { video: { include: { creator: true } } },
    });
    if (!purchase) throw new Error("PURCHASE_NOT_FOUND");

    // If already settled in our DB, just return success immediately
    if (purchase.settled) {
      return { settled: true, videoUrl: purchase.video.url };
    }

    // Poll LND for settlement status
    const { data: invoiceData } = await lnd.get(`/v1/invoice/${data.rHash}`);

    if (invoiceData.settled) {
      const total = purchase.paidSats;
      const creatorCut = Math.floor(total * 0.9); // 90% to creator
      // platformCut = total - creatorCut          // 10% stays in node (not credited)

      // Use a Prisma transaction to atomically: credit creator + mark settled
      await db.$transaction([
        db.user.update({
          where: { id: purchase.video.creatorId },
          data: { balanceSats: { increment: creatorCut } },
        }),
        db.purchase.update({
          where: { id: purchase.id },
          data: { settled: true },
        }),
      ]);

      return { settled: true, videoUrl: purchase.video.url };
    }

    return { settled: false, videoUrl: null };
  });
