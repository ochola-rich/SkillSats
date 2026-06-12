import { createServerFn } from "@tanstack/react-start";
import { db } from "../lib/db";
import { requireAuth } from "../lib/auth";
import { lnd } from "../lib/lnd";

// --- GET BALANCE ---
export const getBalance = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireAuth();
  return {
    balanceSats: user.balanceSats,
    // 1 sat ≈ $0.00065 hardcoded for the demo
    approximateUSD: (user.balanceSats * 0.00065).toFixed(2),
  };
});

// --- WITHDRAW FUNDS (CREATOR only) ---
// Creator submits a BOLT11 payment_request from their personal Lightning wallet.
// Backend: deducts balance → sends LND payment → returns payment_hash.
export const withdrawFunds = createServerFn({ method: "POST" })
  .validator((data: { payment_request: string; amount_sats: number }) => data)
  .handler(async ({ data }: { data: { payment_request: string; amount_sats: number } }) => {
    const user = await requireAuth();

    if (user.balanceSats < data.amount_sats) {
      throw new Error("INSUFFICIENT_BALANCE");
    }

    // Step 1: Deduct balance atomically BEFORE calling LND
    await db.user.update({
      where: { id: user.id },
      data: { balanceSats: { decrement: data.amount_sats } },
    });

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
    } catch (lndError) {
      // If LND fails, attempt to refund the balance.
      // In production, this would be handled more carefully.
      await db.user.update({
        where: { id: user.id },
        data: { balanceSats: { increment: data.amount_sats } },
      });
      throw new Error("LND_PAYMENT_FAILED");
    }
  });
