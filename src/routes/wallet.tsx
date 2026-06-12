import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getBalance, withdrawFunds } from "../server/wallet";
import { getAdWatchHistory } from "../server/ads";
import { useAuth } from "../context/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/wallet")({
  component: WalletPage,
});

function WalletPage() {
  const { refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [withdrawalHash, setWithdrawalHash] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    payment_request: "",
    amount_sats: 0,
  });

  const { data: balanceData } = useQuery({
    queryKey: ["balance"],
    queryFn: () => getBalance(),
  });

  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ["adWatchHistory"],
    queryFn: () => getAdWatchHistory(),
  });

  const withdrawMutation = useMutation({
    mutationFn: (data: typeof formData) => withdrawFunds({ data }),
    onSuccess: (result: { payment_hash: string }) => {
      setWithdrawalHash(result.payment_hash);
      refreshUser();
      queryClient.invalidateQueries({ queryKey: ["balance"] });
      setFormData({ payment_request: "", amount_sats: 0 });
      toast.success("Withdrawal successful!");
    },
    onError: (error: Error) => {
      if (error.message === "INSUFFICIENT_BALANCE") {
        toast.error("Insufficient balance for this withdrawal.");
      } else if (error.message === "LND_PAYMENT_FAILED") {
        toast.error("Payment failed — your balance has been restored.");
      } else {
        toast.error("Withdrawal failed: " + error.message);
      }
    },
  });

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawalHash(null);
    withdrawMutation.mutate(formData);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl font-bold mb-2">My Wallet</h1>
          <p className="text-gray-400">Manage your earnings and Lightning Network payouts.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-3 space-y-8">
            {/* Balance Card */}
            <div className="bg-[#111118] border-2 border-yellow-500/20 rounded-2xl p-8 text-center shadow-[0_0_50px_rgba(247,181,0,0.05)]">
              <p className="text-gray-500 font-semibold uppercase tracking-widest text-xs mb-4">
                Available Balance
              </p>
              <h2 className="text-6xl font-black text-yellow-500 mb-2">
                ⚡ {balanceData?.balanceSats.toLocaleString()} sats
              </h2>
              <p className="text-xl text-gray-400">≈ ${balanceData?.approximateUSD} USD</p>
              <p className="text-[10px] text-gray-600 mt-4 italic">
                Rate: 1 sat ≈ $0.00065 (Demo Rate)
              </p>
            </div>

            {/* Withdraw Form */}
            <div className="bg-[#111118] border border-white/10 rounded-2xl p-8">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-yellow-500">payments</span>
                Withdraw Funds
              </h3>

              {withdrawalHash ? (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 mb-6">
                  <p className="text-green-400 font-bold mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined">check_circle</span>
                    Payment Sent Successfully!
                  </p>
                  <p className="text-xs text-green-500/70 mb-1">Payment Hash:</p>
                  <div className="flex gap-2">
                    <code className="bg-black/40 px-3 py-1.5 rounded text-[10px] font-mono grow truncate text-green-400/80">
                      {withdrawalHash}
                    </code>
                    <button
                      onClick={() => copyToClipboard(withdrawalHash)}
                      className="text-green-400 hover:text-green-300"
                    >
                      <span className="material-symbols-outlined text-sm">content_copy</span>
                    </button>
                  </div>
                  <Button
                    onClick={() => setWithdrawalHash(null)}
                    className="mt-4 w-full bg-green-500/20 hover:bg-green-500/30 text-green-400 border-none"
                  >
                    Done
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleWithdraw} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="invoice">Your Lightning Invoice (BOLT11)</Label>
                    <Textarea
                      id="invoice"
                      placeholder="lnbc1..."
                      required
                      value={formData.payment_request}
                      onChange={(e) =>
                        setFormData({ ...formData, payment_request: e.target.value })
                      }
                      className="bg-[#0a0a0f] border-white/5 font-mono text-xs min-h-[100px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount to withdraw (sats)</Label>
                    <Input
                      id="amount"
                      type="number"
                      min="1"
                      required
                      value={formData.amount_sats}
                      onChange={(e) =>
                        setFormData({ ...formData, amount_sats: parseInt(e.target.value) || 0 })
                      }
                      className="bg-[#0a0a0f] border-white/5 text-lg font-bold"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={withdrawMutation.isPending}
                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-6 rounded-xl shadow-lg shadow-yellow-500/10"
                  >
                    {withdrawMutation.isPending ? "Processing..." : "Confirm Withdrawal"}
                  </Button>
                </form>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            {/* History */}
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-yellow-500">history</span>
              Earnings History
            </h3>
            <div className="bg-[#111118] border border-white/10 rounded-2xl overflow-hidden">
              {loadingHistory ? (
                <div className="p-10 text-center animate-pulse text-gray-500 text-sm font-mono tracking-widest">
                  FETCHING HISTORY...
                </div>
              ) : history?.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-gray-500 mb-4">No ad earnings yet.</p>
                  <Button
                    variant="outline"
                    className="border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/10"
                    onClick={() => (window.location.href = "/earn")}
                  >
                    Visit the Earn Page
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {history?.map(
                    (w: { id: string; adTitle: string; earnedSats: number; watchedAt: Date }) => (
                      <div key={w.id} className="p-4 hover:bg-white/5 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-bold text-sm text-white truncate max-w-[70%]">
                            {w.adTitle}
                          </p>
                          <span className="text-yellow-500 font-mono text-sm font-bold">
                            +{w.earnedSats}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500">
                          {format(new Date(w.watchedAt), "MMM d, h:mm a")}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
