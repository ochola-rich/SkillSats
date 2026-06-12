import React, { useState, useEffect, useRef } from "react";

export default function EarnPage() {
  // --- State Management ---
  const [currentAd, setCurrentAd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);
  const [canClaim, setCanClaim] = useState(false);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [animationText, setAnimationText] = useState(null);
  const [navbarBalance, setNavbarBalance] = useState(0); // Mock navbar balance state

  const videoRef = useRef(null);

  // --- API Calls ---
  const fetchNextAd = async () => {
    setLoading(true);
    setVideoProgress(0);
    setCanClaim(false);

    try {
      const response = await fetch("/api/ads/next");
      if (response.ok) {
        const data = await response.json();
        // Check if data is empty or has no id
        if (data && data.id) {
          setCurrentAd(data);
        } else {
          setCurrentAd(null);
        }
      } else {
        setCurrentAd(null);
      }
    } catch (error) {
      console.error("Error fetching next ad:", error);
      setCurrentAd(null);
    } finally {
      setLoading(false);
    }
  };

  const claimReward = async () => {
    if (!currentAd) return;

    try {
      const response = await fetch(`/api/ads/${currentAd.id}/watched`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const earnedSats = currentAd.rewardAmount || 0;

        // 1. Trigger yellow "+X sats" animation
        setAnimationText(`+${earnedSats} sats`);

        // 2. Update session total counter
        setSessionTotal((prev) => prev + earnedSats);

        // 3. Update the navbar balance display
        setNavbarBalance((prev) => prev + earnedSats);

        // 4. Wait 3 seconds, then clear animation, fetch next ad, and reset UI
        setTimeout(() => {
          setAnimationText(null);
          fetchNextAd();
        }, 3000);
      }
    } catch (error) {
      console.error("Error claiming reward:", error);
    }
  };

  // --- Lifecycle Effects ---
  useEffect(() => {
    fetchNextAd();
  }, []);

  // --- Video Event Handlers ---
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const duration = videoRef.current.duration;
      if (duration) {
        setVideoProgress((current / duration) * 100);
      }
    }
  };

  const handleVideoEnded = () => {
    setCanClaim(true);
  };

  // --- Render Helpers ---
  if (loading) {
    return <div>Loading your next earning opportunity...</div>;
  }

  return (
    <div className="earn-page-container">
      {/* Fake Navbar to demonstrate balance updates */}
      <nav className="navbar">
        <span>SkillSats Logo</span> |
        <span>
          {" "}
          Balance: <strong>{navbarBalance} sats</strong>
        </span>
      </nav>

      <hr />

      {/* Session Running Counter */}
      <div className="session-counter">
        Session Earnings: <strong>{sessionTotal} sats</strong>
      </div>

      <h1>Earn sats for your attention</h1>

      {/* Reward Animation Overlay/Display */}
      {animationText && (
        <div className="sats-animation" style={{ color: "yellow", fontWeight: "bold" }}>
          {animationText}
        </div>
      )}

      {currentAd ? (
        <div className="ad-card">
          <h2>{currentAd.title}</h2>

          {/* HTML5 Video Player */}
          <video
            ref={videoRef}
            src={currentAd.videoUrl}
            controls
            controlsList="nodownload nofullscreen"
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleVideoEnded}
            width="100%"
            style={{ pointerEvents: "none" }} /* Extra layer to prevent manual timeline clicking */
          />

          {/* Custom Progress Bar */}
          <div
            className="progress-bar-container"
            style={{ width: "100%", background: "#ccc", height: "10px" }}
          >
            <div
              className="progress-bar-fill"
              style={{ width: `${videoProgress}%`, background: "green", height: "100%" }}
            />
          </div>

          {/* Claim Button */}
          <button onClick={claimReward} disabled={!canClaim || animationText !== null}>
            Claim {currentAd.rewardAmount} sats
          </button>
        </div>
      ) : (
        /* Empty State */
        <div className="no-ads-state">
          <p>No ads right now, check back soon</p>
        </div>
      )}
    </div>
  );
}
