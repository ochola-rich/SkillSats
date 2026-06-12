import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "../hooks/use-auth";
import { getErrorMessage, hasErrorCode } from "../lib/errors";
import { getNextAd, markAdWatched } from "../server/ads";

type Ad = NonNullable<Awaited<ReturnType<typeof getNextAd>>>;

export const Route = createFileRoute("/earn")({
  component: EarnPage,
  head: () => ({ meta: [{ title: "Earn sats - SkillSats" }] }),
});

function EarnPage() {
  const { user, refreshUser } = useAuth();
  const loadNextAd = useServerFn(getNextAd);
  const claimAd = useServerFn(markAdWatched);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const nextAdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentAd, setCurrentAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [videoEnded, setVideoEnded] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [sessionEarned, setSessionEarned] = useState(0);
  const [notification, setNotification] = useState<number | null>(null);
  const [error, setError] = useState("");

  const fetchNextAd = useCallback(async () => {
    setLoading(true);
    setError("");
    setProgress(0);
    setVideoEnded(false);
    setClaiming(false);
    try {
      setCurrentAd(await loadNextAd());
    } catch (caught) {
      setError(getErrorMessage(caught, "Unable to load an ad."));
    } finally {
      setLoading(false);
    }
  }, [loadNextAd]);

  useEffect(() => {
    void fetchNextAd();
    return () => {
      if (nextAdTimerRef.current) clearTimeout(nextAdTimerRef.current);
    };
  }, [fetchNextAd]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video && Number.isFinite(video.duration) && video.duration > 0) {
      setProgress((video.currentTime / video.duration) * 100);
    }
  };

  const handleClaim = async () => {
    if (!currentAd) return;
    setClaiming(true);
    setError("");
    try {
      const result = await claimAd({ data: { adId: currentAd.id } });
      setSessionEarned((current) => current + result.earned);
      setNotification(result.earned);
      await refreshUser();
      nextAdTimerRef.current = setTimeout(() => {
        setNotification(null);
        void fetchNextAd();
      }, 3_000);
    } catch (caught) {
      setError(
        hasErrorCode(caught, "COOLDOWN_ACTIVE")
          ? "You already watched this ad recently."
          : getErrorMessage(caught, "Unable to claim this reward."),
      );
      setClaiming(false);
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-white/10 bg-[#111118] p-8 text-center">
        <h1 className="text-2xl font-bold">Login to earn sats</h1>
        <p className="mt-2 text-gray-400">Rewards are credited to your SkillSats balance.</p>
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
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#111118] p-4">
        <span className="text-sm text-gray-400">Earned this session</span>
        <span className="font-mono font-bold text-yellow-400">{sessionEarned} sats</span>
      </div>

      <section className="relative rounded-xl border border-white/10 bg-[#111118] p-6">
        <h1 className="text-center text-2xl font-bold">Earn sats for your attention</h1>
        {loading ? (
          <p className="py-16 text-center text-gray-400">Loading the next ad...</p>
        ) : !currentAd ? (
          <div className="py-16 text-center">
            <p className="text-gray-300">No ads right now. Check back soon.</p>
            <button
              type="button"
              onClick={() => void fetchNextAd()}
              className="mt-4 rounded border border-white/15 px-4 py-2"
            >
              Refresh
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-bold">{currentAd.title}</h2>
              <span className="whitespace-nowrap font-mono text-sm text-yellow-400">
                {currentAd.rewardSats} sats
              </span>
            </div>
            <div className="relative overflow-hidden rounded-lg bg-black">
              <video
                ref={videoRef}
                src={currentAd.videoUrl}
                controls
                controlsList="nodownload nofullscreen noremoteplayback"
                disablePictureInPicture
                onEnded={() => setVideoEnded(true)}
                onTimeUpdate={handleTimeUpdate}
                className="ad-video aspect-video w-full"
              />
              <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gray-800">
                <div className="h-full bg-yellow-400" style={{ width: `${progress}%` }} />
              </div>
              {notification !== null && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-4xl font-bold text-yellow-400">
                  +{notification} sats
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleClaim}
              disabled={!videoEnded || claiming || notification !== null}
              className="w-full rounded-md bg-yellow-400 px-4 py-3 font-bold text-black disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
            >
              {claiming ? "Claiming..." : `Claim ${currentAd.rewardSats} sats`}
            </button>
          </div>
        )}
        {error && <p className="mt-4 rounded bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      </section>
    </div>
  );
}
