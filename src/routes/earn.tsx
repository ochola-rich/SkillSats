import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";

export const Route = createFileRoute("/earn")({
  head: () => ({
    meta: [
      { title: "SatsLearn — Earn Sats" },
      { name: "description", content: "Watch curated ads, learn, and stack sats instantly via Lightning." },
    ],
  }),
  component: EarnComponent,
});

interface Ad {
  id: string;
  title: string;
  videoUrl: string;
  rewardSats: number;
  active: boolean;
}

function EarnComponent() {
  const { refreshUser } = useAuth();
  const [ad, setAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [videoEnded, setVideoEnded] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [earnedInSession, setEarnedInSession] = useState(0);
  const [showRewardAnimation, setShowRewardAnimation] = useState(false);
  const [lastEarned, setLastEarned] = useState(0);
  const [error, setError] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const fetchNextAd = async () => {
    try {
      setLoading(true);
      setError("");
      setProgress(0);
      setVideoEnded(false);

      const res = await apiClient.get<Ad>("/api/ads/next");
      if (res.status === 204 || !res.data) {
        setAd(null);
      } else {
        setAd(res.data);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to fetch the next ad. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNextAd();
  }, []);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const duration = videoRef.current.duration;
      if (duration) {
        setProgress((current / duration) * 100);
      }
    }
  };

  const handleVideoEnded = () => {
    setVideoEnded(true);
  };

  const handleClaim = async () => {
    if (!ad) return;
    setClaiming(true);
    try {
      const res = await apiClient.post(`/api/ads/${ad.id}/watched`);
      const earned = res.data.earned || ad.rewardSats;
      setLastEarned(earned);
      setEarnedInSession((prev) => prev + earned);
      setShowRewardAnimation(true);

      // Save watch to history
      if (typeof window !== "undefined") {
        try {
          const historyStr = localStorage.getItem("ad_history") || "[]";
          const history = JSON.parse(historyStr);
          history.unshift({
            id: ad.id,
            title: ad.title,
            rewardSats: earned,
            timestamp: new Date().toISOString(),
          });
          localStorage.setItem("ad_history", JSON.stringify(history.slice(0, 10)));
        } catch (historyErr) {
          console.error("Failed to write ad history:", historyErr);
        }
      }

      await refreshUser();

      setTimeout(() => {
        setShowRewardAnimation(false);
        fetchNextAd();
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to claim rewards.");
      setClaiming(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <style dangerouslySetInnerHTML={{ __html: `
        video.no-seek::-webkit-media-controls-timeline {
          display: none !important;
        }
        video.no-seek::-webkit-media-controls-current-time-display {
          display: none !important;
        }
        video.no-seek::-webkit-media-controls-time-remaining-display {
          display: none !important;
        }
      `}} />

      {/* Session Earnings Counter */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex justify-between items-center">
        <span className="text-sm text-gray-400 font-medium">Session Earnings</span>
        <span className="text-yellow-400 font-bold font-mono text-sm flex items-center gap-1">
          ⚡ {earnedInSession} sats
        </span>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-gray-100">Earn sats for your attention</h2>
          {ad && <p className="text-xs text-yellow-400 font-bold">Reward: {ad.rewardSats} sats</p>}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12 text-gray-400">
            <span>Loading next ad...</span>
          </div>
        ) : error && !ad ? (
          <div className="bg-red-950/20 border border-red-800 text-red-200 p-4 rounded text-sm text-center">
            {error}
          </div>
        ) : !ad ? (
          <div className="text-center py-12 space-y-4">
            <span className="text-4xl text-gray-500 block">📭</span>
            <h3 className="text-lg font-bold text-gray-250">No ads right now, check back soon</h3>
            <p className="text-sm text-gray-400 max-w-xs mx-auto">
              We've run out of campaigns. Please check back later to earn more sats.
            </p>
            <button
              onClick={fetchNextAd}
              className="bg-gray-800 hover:bg-gray-750 border border-gray-700 px-4 py-2 rounded text-xs font-medium transition-all"
            >
              Refresh
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="font-bold text-gray-200 text-sm border-b border-gray-850 pb-2">{ad.title}</h3>

            {/* Video Player */}
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-gray-850">
              <video
                ref={videoRef}
                src={ad.videoUrl}
                controls
                controlsList="nodownload nofullscreen"
                className="w-full h-full object-contain no-seek"
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleVideoEnded}
                autoPlay
              />

              {/* Progress Bar overlay */}
              <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gray-800">
                <div
                  className="h-full bg-yellow-400 transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Reward Success Animation */}
              {showRewardAnimation && (
                <div className="absolute inset-0 bg-gray-950/90 flex flex-col items-center justify-center space-y-2">
                  <span className="text-3xl text-yellow-400 font-extrabold animate-bounce">
                    +{lastEarned} sats
                  </span>
                  <span className="text-xs text-gray-400">Claimed successfully! Loading next ad...</span>
                </div>
              )}
            </div>

            {/* Claim button */}
            <button
              onClick={handleClaim}
              disabled={!videoEnded || claiming || showRewardAnimation}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-950 disabled:bg-gray-800 disabled:text-gray-500 disabled:border-gray-750 disabled:border font-bold py-3 px-4 rounded transition-all cursor-pointer text-sm"
            >
              {claiming
                ? "Claiming..."
                : showRewardAnimation
                ? "Reward Claimed!"
                : videoEnded
                ? `Claim ${ad.rewardSats} sats`
                : "Watch video to claim rewards"}
            </button>
            {error && <p className="text-xs text-red-400 text-center">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}