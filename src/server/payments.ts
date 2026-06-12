import { createServerFn } from "@tanstack/react-start";
import { db, runSerializable } from "../lib/db.server";
import { requireAuth } from "../lib/auth.server";
import { b64ToHex, getLndClient } from "../lib/lnd.server";
import { calculateCreatorRevenue } from "../lib/domain";
import { invoiceStatusSchema, videoIdSchema } from "../lib/schemas";

// --- PURCHASE VIDEO ---
// Creates an LND invoice for the video price and saves a pending Purchase record.
// Returns the payment_request (for QR display) and r_hash (for polling).
export const purchaseVideo = createServerFn({ method: "POST" })
  .validator(videoIdSchema)
  .handler(async ({ data }) => {
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
    const { data: invoiceData } = await getLndClient().post("/v1/invoices", {
      value: video.priceSats,
      memo: `SkillSats: ${video.title}`,
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
  .validator(invoiceStatusSchema)
  .handler(async ({ data }) => {
    const user = await requireAuth();
    // Look up the purchase by rHash
    const purchase = await db.purchase.findFirst({
      where: { rHash: data.rHash, userId: user.id },
      include: { video: true },
    });
    if (!purchase) throw new Error("PURCHASE_NOT_FOUND");

    // If already settled in our DB, just return success immediately
    if (purchase.settled) {
      return { settled: true, videoUrl: purchase.video.url };
    }

    // Poll LND for settlement status
    const { data: invoiceData } = await getLndClient().get(`/v1/invoice/${data.rHash}`);

    if (invoiceData.settled) {
      await runSerializable(async (transaction) => {
        const result = await transaction.purchase.updateMany({
          where: { id: purchase.id, settled: false },
          data: { settled: true },
        });
        if (result.count === 0) return;

        await transaction.user.update({
          where: { id: purchase.video.creatorId },
          data: { balanceSats: { increment: calculateCreatorRevenue(purchase.paidSats) } },
        });
      });

      return { settled: true, videoUrl: purchase.video.url };
    }

    return { settled: false, videoUrl: null };
  });
