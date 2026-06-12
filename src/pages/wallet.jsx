import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";

const SAT_TO_USD_RATE = 0.00065;

export default function Wallet() {
  const { user, refreshUser } = useAuth();
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [invoice, setInvoice] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [paymentHash, setPaymentHash] = useState(null);
  const [adHistory, setAdHistory] = useState([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      // Fetch user's ad watch history if the backend supports this endpoint
      const { data } = await client.get("/api/auth/me");
      // Assuming history is attached to the user object or fetched separately
      if (data.adWatches) setAdHistory(data.adWatches);
    } catch (error) {
      console.error("Failed to load history", error);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!invoice || !withdrawAmount) return alert("Please fill in both fields.");
    if (parseInt(withdrawAmount) > user.balanceSats) return alert("Insufficient balance.");

    setIsWithdrawing(true);
    setPaymentHash(null);

    try {
      const { data } = await client.post("/api/wallet/withdraw", {
        payment_request: invoice,
        amount_sats: parseInt(withdrawAmount),
      });

      setPaymentHash(data.payment_hash);
      setInvoice("");
      setWithdrawAmount("");
      refreshUser(); // Updates balance in context
    } catch (error) {
      console.error("Withdrawal failed", error);
      alert(error.response?.data?.error || "Failed to process withdrawal.");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const balanceUSD = ((user?.balanceSats || 0) * SAT_TO_USD_RATE).toFixed(2);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-white mb-6">Wallet</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Balance & Withdraw Column */}
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 p-8 rounded-lg text-center">
            <p className="text-gray-400 mb-2 font-medium">Available Balance</p>
            <h2 className="text-5xl font-bold text-yellow-400 mb-2">
              ⚡ {user?.balanceSats?.toLocaleString() || 0}
            </h2>
            <p className="text-gray-500">≈ ${balanceUSD} USD</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg text-white">
            <h3 className="text-lg font-bold mb-4">Withdraw via Lightning</h3>
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Lightning Invoice (payment_request)
                </label>
                <textarea
                  required
                  rows="3"
                  value={invoice}
                  onChange={(e) => setInvoice(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded p-2 font-mono text-sm break-all"
                  placeholder="lnbc..."
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Amount (Sats)</label>
                <input
                  required
                  type="number"
                  min="1"
                  max={user?.balanceSats || 0}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded p-2"
                />
              </div>
              <button
                disabled={isWithdrawing || !user?.balanceSats}
                type="submit"
                className="w-full bg-yellow-400 text-gray-950 font-bold py-2 rounded hover:bg-yellow-500 disabled:opacity-50 transition-colors"
              >
                {isWithdrawing ? "Sending Payment..." : "Withdraw"}
              </button>
            </form>

            {paymentHash && (
              <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded text-sm break-all">
                <p className="text-green-400 font-bold mb-1">✓ Withdrawal Successful</p>
                <p className="text-gray-400">Hash: {paymentHash}</p>
              </div>
            )}
          </div>
        </div>

        {/* History Column */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-bold text-white mb-4">AdWatch Earnings History</h3>
          {adHistory.length === 0 ? (
            <p className="text-gray-400 text-sm">No earnings history yet.</p>
          ) : (
            <div className="space-y-3">
              {adHistory.map((watch) => (
                <div
                  key={watch.id}
                  className="flex items-center justify-between p-3 bg-gray-950 border border-gray-800 rounded"
                >
                  <div>
                    <p className="text-white text-sm">Watched Ad</p>
                    <p className="text-xs text-gray-500">
                      {new Date(watch.watchedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-yellow-400 font-bold text-sm">
                    + {watch.earnedSats} sats
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
