import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { QRCodeSVG } from "qrcode.react";

export const Route = createFileRoute("/learn/$videoId")({
  head: () => ({
    meta: [
      { title: "SkillSats — Video Player" },
      { name: "description", content: "Watch and learn, paid in sats." },
    ],
  }),
  component: VideoPlayerComponent,
});

interface VideoMetadata {
  id: string;
  title: string;
  description: string;
  priceSats: number;
  isFree: boolean;
  courseId: string;
  creatorId: string;
  creatorUsername: string;
  createdAt: string;
}

function VideoPlayerComponent() {
  const { videoId } = Route.useParams();
  const { refreshUser } = useAuth();

  const [video, setVideo] = useState<VideoMetadata | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [invoice, setInvoice] = useState<{
    payment_request: string;
    r_hash: string;
    amount_sats: number;
  } | null>(null);
  const [isSettled, setIsSettled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const pollIntervalRef = useRef<any>(null);

  const loadVideoDetails = async () => {
    try {
      setLoading(true);
      setError("");

      const metaRes = await apiClient.get<VideoMetadata>(`/api/videos/${videoId}`);
      setVideo(metaRes.data);

      try {
        const accessRes = await apiClient.get<{ url: string }>(`/api/videos/${videoId}/access`);
        if (accessRes.data && accessRes.data.url) {
          setVideoUrl(accessRes.data.url);
          setHasAccess(true);
        } else {
          setHasAccess(false);
        }
      } catch (accessErr: any) {
        setHasAccess(false);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to load video details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideoDetails();

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [videoId]);

  const handleUnlock = async () => {
    if (!video) return;
    setPurchaseLoading(true);
    setError("");
    try {
      const res = await apiClient.post(`/api/videos/${video.id}/purchase`);
      setInvoice(res.data);
      startPolling(res.data.r_hash);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to generate Lightning invoice.");
      setPurchaseLoading(false);
    }
  };

  const startPolling = (r_hash: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await apiClient.get<{ settled: boolean; videoUrl?: string }>(
          `/api/invoices/${r_hash}/status`,
        );
        if (res.data.settled) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
          setIsSettled(true);
          setVideoUrl(res.data.videoUrl || null);
          setHasAccess(true);
          await refreshUser();
          setPurchaseLoading(false);
        }
      } catch (err) {
        console.error("Error polling invoice status:", err);
      }
    }, 2000);
  };

  const handleCopy = () => {
    if (!invoice) return;
    navigator.clipboard.writeText(invoice.payment_request);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-gray-400">
        <span>Loading video player...</span>
      </div>
    );
  }

  if (error && !video) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-red-950/20 border border-red-800 rounded-lg text-red-200">
        <h3 className="font-bold mb-2">Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!video) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-gray-800">
        {hasAccess && videoUrl ? (
          <video src={videoUrl} controls className="w-full h-full object-contain" autoPlay />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-gray-950/90 text-center">
            {!invoice ? (
              <div className="space-y-4 max-w-md">
                <span className="text-4xl text-yellow-400 font-extrabold block">⚡</span>
                <h3 className="text-xl font-bold text-gray-100">{video.title}</h3>
                <p className="text-sm text-gray-400">
                  This premium video requires a purchase of{" "}
                  <span className="text-yellow-400 font-bold">{video.priceSats} sats</span> to
                  unlock.
                </p>
                <button
                  onClick={handleUnlock}
                  disabled={purchaseLoading}
                  className="bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-bold px-6 py-2.5 rounded-lg text-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {purchaseLoading ? "Generating Invoice..." : `Unlock for ${video.priceSats} sats`}
                </button>
                {error && <p className="text-xs text-red-400 pt-2">{error}</p>}
              </div>
            ) : isSettled ? (
              <div className="space-y-2 text-center">
                <span className="text-5xl text-green-500 block animate-bounce">✓</span>
                <h4 className="text-lg font-bold text-gray-100">Payment Received!</h4>
                <p className="text-sm text-gray-400">Unlocking video...</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6 items-center w-full max-w-2xl text-left bg-gray-900 p-6 rounded-lg border border-gray-800">
                <div className="flex flex-col items-center justify-center bg-white p-3 rounded-lg w-44 h-44 mx-auto">
                  <QRCodeSVG value={invoice.payment_request} size={150} />
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-gray-200">Pay with Lightning</h4>
                    <p className="text-xs text-gray-400 mt-1">
                      Scan the QR code or copy the invoice below to pay{" "}
                      <span className="text-yellow-400 font-bold">{invoice.amount_sats} sats</span>.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <textarea
                      readOnly
                      value={invoice.payment_request}
                      className="w-full bg-gray-950 border border-gray-850 rounded p-2 text-xs text-gray-400 font-mono resize-none focus:outline-none h-16"
                    />
                    <button
                      onClick={handleCopy}
                      className="w-full bg-gray-850 hover:bg-gray-800 text-gray-200 border border-gray-700 py-1.5 px-3 rounded text-xs transition-all cursor-pointer font-medium"
                    >
                      {copied ? "Copied!" : "Copy Invoice String"}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
                    <span>Waiting for payment...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">{video.title}</h1>
            <p className="text-sm text-gray-400 mt-1">
              Created by <span className="text-yellow-400">@{video.creatorUsername}</span>
            </p>
          </div>
          <div className="bg-gray-800 text-yellow-400 border border-gray-750 px-3 py-1 rounded text-sm font-mono font-bold">
            {video.isFree ? "FREE" : `${video.priceSats} sats`}
          </div>
        </div>
        <hr className="border-gray-800" />
        <div>
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Description</h3>
          <p className="text-gray-300 mt-2 text-sm whitespace-pre-wrap">{video.description}</p>
        </div>
        {video.courseId && (
          <div className="text-xs text-gray-400 bg-gray-950 px-3 py-2 rounded inline-block">
            Course ID: <span className="font-mono text-gray-300">{video.courseId}</span>
          </div>
        )}
      </div>
    </div>
  );
}
export default VideoPlayerComponent;
