import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { getVideoMeta, getVideoAccess } from "../server/videos";
import { purchaseVideo, checkInvoiceStatus } from "../server/payments";

export const Route = createFileRoute("/learn/$videoId")({
  component: LearnVideo,
});

function LearnVideo() {
  const { videoId } = Route.useParams();
  const [purchaseData, setPurchaseData] = useState<{
    payment_request: string;
    r_hash: string;
  } | null>(null);
  const [isSettled, setIsSettled] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: meta, isLoading: loadingMeta } = useQuery({
    queryKey: ["videoMeta", videoId],
    queryFn: () => getVideoMeta({ data: { videoId } }),
  });

  const { data: access, isLoading: loadingAccess } = useQuery({
    queryKey: ["videoAccess", videoId],
    queryFn: () => getVideoAccess({ data: { videoId } }),
    enabled: !isSettled, // Don't refetch if we just settled
  });

  const purchaseMutation = useMutation({
    mutationFn: () => purchaseVideo({ data: { videoId } }),
    onSuccess: (data: { payment_request: string; r_hash: string }) => {
      setPurchaseData(data);
      startPolling(data.r_hash);
    },
  });

  useEffect(() => {
    if (access?.hasAccess) {
      setVideoUrl(access.videoUrl);
      setIsSettled(true);
    }
  }, [access]);

  useEffect(() => {
    return () => stopPolling();
  }, []);

  const startPolling = (rHash: string) => {
    stopPolling();
    pollIntervalRef.current = setInterval(async () => {
      try {
        const result = await checkInvoiceStatus({ data: { rHash } });
        if (result.settled) {
          setIsSettled(true);
          setVideoUrl(result.videoUrl);
          stopPolling();
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 2000);
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const copyInvoice = () => {
    if (purchaseData?.payment_request) {
      navigator.clipboard.writeText(purchaseData.payment_request);
      alert("Invoice copied to clipboard!");
    }
  };

  if (loadingMeta || loadingAccess) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-yellow-500"></div>
      </div>
    );
  }

  if (!meta)
    return <div className="p-10 text-white bg-[#0a0a0f] min-h-screen">Video not found</div>;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-5xl mx-auto p-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">{meta.title}</h1>
          <p className="text-gray-400">by @{meta.creatorUsername}</p>
        </header>

        <div className="video-container rounded-2xl overflow-hidden bg-black border border-white/5 relative aspect-video">
          {isSettled && videoUrl ? (
            <video src={videoUrl} controls className="w-full h-full" autoPlay />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center p-8 text-center paywall-overlay">
              {!purchaseData ? (
                <div className="max-w-md">
                  <span className="material-symbols-outlined text-6xl text-yellow-500 mb-4">
                    lock
                  </span>
                  <h2 className="text-3xl font-bold mb-4">Unlock this Lesson</h2>
                  <p className="text-gray-300 mb-8">
                    Gain full access to this video by paying the creator ⚡ {meta.priceSats} sats.
                  </p>
                  <button
                    onClick={() => purchaseMutation.mutate()}
                    disabled={purchaseMutation.isPending}
                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 rounded-xl transition-all transform active:scale-95 disabled:opacity-50"
                  >
                    {purchaseMutation.isPending
                      ? "Generating Invoice..."
                      : `Pay ⚡ ${meta.priceSats} Sats`}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="bg-white p-3 rounded-xl mb-6 shadow-2xl shadow-yellow-500/10 border-4 border-yellow-500">
                    <QRCodeSVG value={purchaseData.payment_request} size={220} />
                  </div>

                  <div className="text-center mb-6">
                    <p className="text-yellow-500 font-mono text-xl font-bold mb-2">
                      ⚡ {meta.priceSats} sats
                    </p>
                    <p className="text-sm text-gray-400 animate-pulse flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-sm">sync</span>
                      Waiting for payment settlement...
                    </p>
                  </div>

                  <div className="flex gap-2 w-full max-w-sm">
                    <input
                      readOnly
                      value={purchaseData.payment_request}
                      className="bg-[#16161f] border border-white/10 rounded-lg px-4 py-2 text-xs font-mono grow text-gray-400"
                    />
                    <button
                      onClick={copyInvoice}
                      className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                      Copy
                    </button>
                  </div>

                  <button
                    onClick={() => setPurchaseData(null)}
                    className="mt-6 text-gray-500 hover:text-white text-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h3 className="text-lg font-semibold mb-3">About this lesson</h3>
            <p className="text-gray-400 leading-relaxed">{meta.description}</p>
          </div>
          <div className="bg-[#111118] border border-white/10 rounded-xl p-6 h-fit">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-yellow-500">verified</span>
              Course Details
            </h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Course ID</span>
                <span className="text-gray-300 font-mono">{meta.courseId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Published</span>
                <span className="text-gray-300">
                  {new Date(meta.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Access</span>
                <span className="text-gray-300">
                  {meta.isFree ? "Lifetime Free" : "One-time Purchase"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
