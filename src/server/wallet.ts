import { createServerFn } from "@tanstack/react-start";
import { db } from "../lib/db.server";
import { requireAuth, requireRole } from "../lib/auth.server";
import { getLndClient, normalizeLndError } from "../lib/lnd.server";
import { satsToUsd } from "../lib/domain";
import { withdrawSchema } from "../lib/schemas";

// --- GET BALANCE ---
export const getBalance = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireAuth();
  return {
    balanceSats: user.balanceSats,
    // 1 sat ≈ $0.00065 hardcoded for the demo
    approximateUSD: satsToUsd(user.balanceSats),
  };
});

// --- WITHDRAW FUNDS (CREATOR only) ---
// Creator submits a BOLT11 payment_request from their personal Lightning wallet.
// Backend: deducts balance → sends LND payment → returns payment_hash.
export const withdrawFunds = createServerFn({ method: "POST" })
  .validator(withdrawSchema)
  .handler(async ({ data }) => {
    const user = await requireRole("CREATOR");
    let lnd;
    let decodedInvoice;
    try {
      lnd = getLndClient();
      ({ data: decodedInvoice } = await lnd.get(
        `/v1/payreq/${encodeURIComponent(data.payment_request)}`,
      ));
    } catch (error) {
      throw normalizeLndError(error);
    }
    if (Number(decodedInvoice.num_satoshis) !== data.amount_sats) {
      throw new Error("INVOICE_AMOUNT_MISMATCH");
    }

    // Step 1: Deduct balance atomically BEFORE calling LND
    const deduction = await db.user.updateMany({
      where: { id: user.id, balanceSats: { gte: data.amount_sats } },
      data: { balanceSats: { decrement: data.amount_sats } },
    });
    if (deduction.count === 0) throw new Error("INSUFFICIENT_BALANCE");

    try {
      // Step 2: Send the payment via LND
      // For exact-amount invoices, omit the `amt` field.
      // For zero-amount invoices, pass `amt: data.amount_sats`.
      const { data: paymentData } = await lnd.post("/v1/channels/transactions", {
        payment_request: data.payment_request,
        // amt: data.amount_sats, // uncomment for zero-amount invoices
      });

      return {
        success: true,
        payment_hash: paymentData.payment_hash,
        amount_sats: data.amount_sats,
      };
    } catch {
      // If LND fails, attempt to refund the balance.
      // In production, this would be handled more carefully.
      await db.user.update({
        where: { id: user.id },
        data: { balanceSats: { increment: data.amount_sats } },
      });
      throw new Error("LND_PAYMENT_FAILED");
    }
  });
