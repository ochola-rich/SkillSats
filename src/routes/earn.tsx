import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getNextAd, markAdWatched } from "../server/ads";
import { useAuth } from "../context/auth";

export const Route = createFileRoute("/earn")({
  head: () => ({
    meta: [
      { title: "SatsLearn — Earn Sats" },
      {
        name: "description",
        content: "Watch curated ads, learn, and stack sats instantly via Lightning.",
      },
    ],
  }),
  component: EarnPage,
});

function EarnPage() {
  const { refreshUser } = useAuth();
  const [videoEnded, setVideoEnded] = useState(false);
  const [sessionEarned, setSessionEarned] = useState(0);
  const [progress, setProgress] = useState(0);
  const [notification, setNotification] = useState<{ message: string; sats: number } | null>(null);

  const {
    data: currentAd,
    isLoading,
    refetch: refetchAd,
  } = useQuery({
    queryKey: ["nextAd"],
    queryFn: () => getNextAd(),
    refetchOnWindowFocus: false,
  });

  const markWatchedMutation = useMutation({
    mutationFn: (adId: string) => markAdWatched({ data: { adId } }),
    onSuccess: (data: { earned: number; newBalance: number }) => {
      setSessionEarned((prev) => prev + data.earned);
      refreshUser();
      setNotification({ message: "Sats earned!", sats: data.earned });

      setTimeout(() => {
        setNotification(null);
      }, 2000);

      setTimeout(() => {
        setVideoEnded(false);
        setProgress(0);
        refetchAd();
      }, 3000);
    },
    onError: (error: Error) => {
      if (error.message === "COOLDOWN_ACTIVE") {
        alert("You already watched this ad recently. Try another one!");
      } else {
        alert("Failed to claim reward: " + error.message);
      }
    },
  });

  const handleEnded = () => {
    setVideoEnded(true);
    setProgress(100);
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget;
    if (video.duration) {
      setProgress((video.currentTime / video.duration) * 100);
    }
  };

  const handleClaim = () => {
    if (currentAd && videoEnded) {
      markWatchedMutation.mutate(currentAd.id);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-yellow-500"></div>
      </div>
    );
  }

  if (!currentAd) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-white p-6">
        <span className="material-symbols-outlined text-6xl text-gray-600 mb-4">coffee</span>
        <h2 className="text-2xl font-bold mb-2">No ads right now</h2>
        <p className="text-gray-400 mb-6">Check back soon for more opportunities to earn!</p>
        <button
          onClick={() => refetchAd()}
          className="bg-white/10 hover:bg-white/20 px-6 py-2 rounded-lg transition-colors"
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6 relative">
      {/* Session Earnings */}
      <div className="max-w-3xl mx-auto mb-12 text-center">
        <p className="text-yellow-500 font-mono text-lg mb-1">Earned this session</p>
        <h2 className="text-5xl font-bold text-yellow-500">⚡ {sessionEarned} sats</h2>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Earn sats for your attention</h1>
          <p className="text-gray-400">Watch the video below to completion to claim your reward.</p>
        </div>

        <div className="bg-[#111118] border border-white/10 rounded-2xl p-6 mb-8">
          <h3 className="text-xl font-bold mb-4">{currentAd.title}</h3>

          <div className="relative mb-4">
            <video
              key={currentAd.id}
              src={currentAd.videoUrl}
              controls
              controlsList="nodownload nofullscreen noremoteplayback"
              disablePictureInPicture
              onEnded={handleEnded}
              onTimeUpdate={handleTimeUpdate}
              className="w-full rounded-lg ad-video"
              autoPlay
            />

            {/* Custom Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-800 rounded-b-lg overflow-hidden">
              <div
                className="h-full bg-[#F7B500] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <button
            onClick={handleClaim}
            disabled={!videoEnded || markWatchedMutation.isPending}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all transform active:scale-95 ${
              videoEnded && !markWatchedMutation.isPending
                ? "bg-[#F7B500] text-black hover:bg-yellow-400"
                : "bg-gray-700 text-gray-400 cursor-not-allowed"
            }`}
          >
            {markWatchedMutation.isPending
              ? "Claiming..."
              : videoEnded
                ? `Claim ⚡ ${currentAd.rewardSats * 0.6} sats`
                : "Watch to end to claim"}
          </button>
        </div>
      </div>

      {/* Floating Reward Notification */}
      {notification && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50 animate-in fade-in zoom-in duration-300">
          <div className="bg-black/80 backdrop-blur-md px-8 py-4 rounded-2xl border-2 border-yellow-500 shadow-[0_0_40px_rgba(247,181,0,0.3)]">
            <p className="text-yellow-500 text-4xl font-bold">+{notification.sats} sats</p>
          </div>
        </div>
      )}
    </div>
  );
}
