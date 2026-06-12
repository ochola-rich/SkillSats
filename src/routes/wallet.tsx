import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { useAuth } from "../hooks/use-auth";
import { getErrorMessage, hasErrorCode } from "../lib/errors";
import { getAdWatchHistory } from "../server/ads";
import { getBalance, withdrawFunds } from "../server/wallet";

type HistoryItem = Awaited<ReturnType<typeof getAdWatchHistory>>[number];

export const Route = createFileRoute("/wallet")({
  component: WalletPage,
  head: () => ({ meta: [{ title: "Wallet - SkillSats" }] }),
});

function WalletPage() {
  const { user, refreshUser } = useAuth();
  const loadBalance = useServerFn(getBalance);
  const loadHistory = useServerFn(getAdWatchHistory);
  const withdraw = useServerFn(withdrawFunds);
  const [balance, setBalance] = useState({ balanceSats: 0, approximateUSD: "0.00" });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [paymentRequest, setPaymentRequest] = useState("");
  const [amountSats, setAmountSats] = useState(0);
  const [paymentHash, setPaymentHash] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadWallet = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [nextBalance, nextHistory] = await Promise.all([loadBalance(), loadHistory()]);
      setBalance(nextBalance);
      setHistory(nextHistory);
    } catch (caught) {
      setError(getErrorMessage(caught, "Unable to load your wallet."));
    } finally {
      setLoading(false);
    }
  }, [loadBalance, loadHistory, user]);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  const handleWithdraw = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setPaymentHash("");
    try {
      const result = await withdraw({
        data: { payment_request: paymentRequest, amount_sats: amountSats },
      });
      setPaymentHash(result.payment_hash);
      setPaymentRequest("");
      setAmountSats(0);
      await Promise.all([refreshUser(), loadWallet()]);
    } catch (caught) {
      if (hasErrorCode(caught, "INSUFFICIENT_BALANCE")) {
        setError("Insufficient balance.");
      } else if (hasErrorCode(caught, "INVOICE_AMOUNT_MISMATCH")) {
        setError("The invoice amount does not match the withdrawal amount.");
      } else if (hasErrorCode(caught, "LND_PAYMENT_FAILED")) {
        setError("Payment failed. Your balance has been restored.");
      } else {
        setError(getErrorMessage(caught, "Withdrawal failed."));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-white/10 bg-[#111118] p-8 text-center">
        <h1 className="text-2xl font-bold">Login to view your wallet</h1>
        <Link
          to="/login"
          className="mt-5 inline-block rounded-md bg-yellow-400 px-5 py-2 font-bold text-black"
        >
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <section className="rounded-xl border border-white/10 bg-[#111118] p-6">
        <p className="text-sm text-gray-400">Available balance</p>
        <p className="mt-2 font-mono text-4xl font-bold text-yellow-400">
          {balance.balanceSats.toLocaleString()} sats
        </p>
        <p className="mt-2 text-gray-400">Approximately ${balance.approximateUSD} USD</p>
        <p className="mt-1 text-xs text-gray-500">Demo rate: 1 sat = $0.00065</p>
      </section>

      {error && <p className="rounded bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      {paymentHash && (
        <div className="rounded border border-green-500/30 bg-green-500/10 p-4 text-green-300">
          <p className="font-bold">Payment sent</p>
          <p className="mt-1 break-all font-mono text-xs">{paymentHash}</p>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(paymentHash)}
            className="mt-2 text-sm underline"
          >
            Copy payment hash
          </button>
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        <section className="rounded-xl border border-white/10 bg-[#111118] p-6">
          <h2 className="text-xl font-bold">Withdraw sats</h2>
          {user.role === "CREATOR" ? (
            <form onSubmit={handleWithdraw} className="mt-5 space-y-4">
              <label className="block text-sm text-gray-300">
                Lightning invoice (BOLT11)
                <textarea
                  value={paymentRequest}
                  onChange={(event) => setPaymentRequest(event.target.value)}
                  rows={5}
                  placeholder="lnbc1..."
                  className="mt-1 w-full resize-none rounded-md border border-white/10 bg-[#0a0a0f] p-3 font-mono text-xs"
                  required
                />
              </label>
              <label className="block text-sm text-gray-300">
                Amount in sats
                <input
                  type="number"
                  min={1}
                  value={amountSats || ""}
                  onChange={(event) => setAmountSats(Number(event.target.value))}
                  className="mt-1 w-full rounded-md border border-white/10 bg-[#0a0a0f] px-3 py-2"
                  required
                />
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-yellow-400 px-4 py-2 font-bold text-black disabled:opacity-50"
              >
                {submitting ? "Sending..." : "Withdraw"}
              </button>
            </form>
          ) : (
            <p className="mt-4 text-sm text-gray-400">
              Withdrawals are currently available to creator accounts.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-white/10 bg-[#111118] p-6">
          <h2 className="text-xl font-bold">Ad earnings</h2>
          {loading ? (
            <p className="py-8 text-center text-gray-400">Loading history...</p>
          ) : history.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              No ad earnings yet. Visit the Earn page.
            </p>
          ) : (
            <div className="mt-4 divide-y divide-white/10">
              {history.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium">{item.adTitle}</p>
                    <time className="text-xs text-gray-500">
                      {new Date(item.watchedAt).toLocaleString()}
                    </time>
                  </div>
                  <span className="whitespace-nowrap font-mono text-sm text-yellow-400">
                    +{item.earnedSats} sats
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
