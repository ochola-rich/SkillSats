import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "SatsLearn Wallet — Bitcoin Lightning" },
      { name: "description", content: "Manage your sats balance and Lightning transactions." },
    ],
  }),
  component: WalletComponent,
});

interface AdWatchItem {
  id: string;
  title: string;
  rewardSats: number;
  timestamp: string;
}

function WalletComponent() {
  const { user, refreshUser } = useAuth();
  const [invoiceInput, setInvoiceInput] = useState("");
  const [amountSats, setAmountSats] = useState<number>(0);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [paymentHash, setPaymentHash] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [adHistory, setAdHistory] = useState<AdWatchItem[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const historyStr = localStorage.getItem("ad_history") || "[]";
        setAdHistory(JSON.parse(historyStr));
      } catch (err) {
        console.error("Failed to parse ad watch history:", err);
      }
    }
  }, []);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setPaymentHash("");

    if (!invoiceInput) {
      setError("Please provide a Lightning invoice.");
      return;
    }

    if (amountSats <= 0) {
      setError("Withdrawal amount must be greater than 0.");
      return;
    }

    setWithdrawLoading(true);
    try {
      const res = await apiClient.post("/api/wallet/withdraw", {
        payment_request: invoiceInput,
        amount_sats: amountSats,
      });

      setPaymentHash(res.data.payment_hash || "Simulated payment hash");
      setSuccessMsg("Withdrawal processed successfully!");
      setInvoiceInput("");
      setAmountSats(0);
      await refreshUser();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || "Withdrawal failed. Check your balance or invoice.");
    } finally {
      setWithdrawLoading(false);
    }
  };

  const balanceSats = user?.balanceSats ?? 0;
  const usdValue = balanceSats * 0.00065;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg space-y-2">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Available Balance</span>
          <p className="text-3xl font-bold text-yellow-400 font-mono">
            ⚡ {balanceSats.toLocaleString()} sats
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg space-y-2">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Estimated USD Value</span>
          <p className="text-3xl font-bold text-gray-100 font-mono">
            ${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-gray-500 font-mono">Hardcoded rate: 1 sat = $0.00065</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Withdrawal Form */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg space-y-6">
          <h3 className="text-sm font-bold text-gray-100 border-b border-gray-800 pb-3">Withdraw Sats</h3>

          {error && (
            <div className="bg-red-950/20 border border-red-800 text-red-200 p-3 rounded text-xs">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="bg-green-950/20 border border-green-800 text-green-200 p-3 rounded text-xs space-y-1">
              <p className="font-bold">{successMsg}</p>
              {paymentHash && (
                <p className="font-mono break-all text-[10px] text-green-400 select-all">
                  Hash: {paymentHash}
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleWithdraw} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                Lightning Invoice (payment_request)
              </label>
              <textarea
                value={invoiceInput}
                onChange={(e) => setInvoiceInput(e.target.value)}
                rows={4}
                placeholder="lnbc..."
                className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-gray-100 focus:outline-none focus:border-yellow-400 text-xs font-mono resize-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase mb-1">Amount to Withdraw (sats)</label>
              <input
                type="number"
                value={amountSats || ""}
                onChange={(e) => setAmountSats(Math.max(0, parseInt(e.target.value) || 0))}
                min={1}
                className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-gray-100 focus:outline-none focus:border-yellow-400 text-sm font-mono"
                required
              />
            </div>

            <button
              type="submit"
              disabled={withdrawLoading}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-bold py-2.5 px-4 rounded transition-all disabled:opacity-50 text-sm cursor-pointer"
            >
              {withdrawLoading ? "Processing Withdrawal..." : "Withdraw"}
            </button>
          </form>
        </div>

        {/* Ad Watch History */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg space-y-6">
          <h3 className="text-sm font-bold text-gray-100 border-b border-gray-800 pb-3">AdWatch History</h3>

          {adHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No recent ad watches recorded in this browser.
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-1">
              {adHistory.map((item, idx) => (
                <div
                  key={`${item.id}-${idx}`}
                  className="p-3 bg-gray-950 border border-gray-850 rounded flex justify-between items-center text-xs"
                >
                  <div className="space-y-1">
                    <p className="font-bold text-gray-300 line-clamp-1">{item.title}</p>
                    <p className="text-[10px] text-gray-500">
                      {new Date(item.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-yellow-400 font-bold font-mono">
                    +{item.rewardSats} sats
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default WalletComponent;