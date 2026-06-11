import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "SatsLearn Creator Dashboard" },
      { name: "description", content: "Track your courses, earnings, and learners." },
    ],
  }),
  component: DashboardComponent,
});

interface VideoSummary {
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

function DashboardComponent() {
  const { user, refreshUser } = useAuth();
  const [videos, setVideos] = useState<VideoSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceSats, setPriceSats] = useState<number>(0);
  const [isFree, setIsFree] = useState(false);
  const [courseId, setCourseId] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<VideoSummary[]>("/api/videos");
      setVideos(res.data);
    } catch (err: any) {
      console.error(err);
      setError("Failed to fetch videos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  // Filter creator's videos
  const creatorVideos = videos.filter(
    (v) => v.creatorId === user?.id || v.creatorUsername === user?.username
  );

  // Helper to simulate stable purchase counts for demo
  const getMockPurchaseCount = (videoId: string) => {
    if (typeof window !== "undefined" && localStorage.getItem(`uploaded_${videoId}`)) {
      return parseInt(localStorage.getItem(`purchases_${videoId}`) || "0", 10);
    }
    // Stable hash based on videoId characters
    let hash = 0;
    for (let i = 0; i < videoId.length; i++) {
      hash = videoId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % 25) + 2; // Returns a number between 2 and 26
  };

  const totalPurchases = creatorVideos.reduce((sum, v) => sum + getMockPurchaseCount(v.id), 0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setVideoFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!videoFile) {
      setError("Please select a video file to upload.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("priceSats", String(isFree ? 0 : priceSats));
    formData.append("isFree", String(isFree));
    formData.append("courseId", courseId);
    formData.append("file", videoFile);

    try {
      const res = await apiClient.post<VideoSummary>("/api/videos", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (typeof window !== "undefined") {
        localStorage.setItem(`uploaded_${res.data.id}`, "true");
        localStorage.setItem(`purchases_${res.data.id}`, "0");
      }

      setSuccessMsg("Video uploaded successfully!");
      // Reset form
      setTitle("");
      setDescription("");
      setPriceSats(0);
      setIsFree(false);
      setCourseId("");
      setVideoFile(null);
      // Reset input element
      const fileInput = document.getElementById("video-file") as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      // Refresh list
      await fetchVideos();
      await refreshUser();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to upload video.");
    } finally {
      setUploading(false);
    }
  };

  if (user?.role !== "CREATOR") {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-gray-900 border border-gray-800 rounded-lg text-center space-y-4">
        <span className="text-3xl">🚫</span>
        <h3 className="text-lg font-bold text-gray-100">Creator Account Required</h3>
        <p className="text-sm text-gray-400">
          Only users registered with the **CREATOR** role can access this page to upload courses.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Creator stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg space-y-2">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Creator Balance</span>
          <p className="text-3xl font-bold text-yellow-400 font-mono">
            ⚡ {(user?.balanceSats ?? 0).toLocaleString()} sats
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg space-y-2">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Videos Uploaded</span>
          <p className="text-3xl font-bold text-gray-100 font-mono">{creatorVideos.length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg space-y-2">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Purchases</span>
          <p className="text-3xl font-bold text-gray-100 font-mono">{totalPurchases}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Form */}
        <div className="lg:col-span-1 bg-gray-900 border border-gray-800 p-6 rounded-lg h-fit space-y-6">
          <h3 className="text-lg font-bold text-gray-100 border-b border-gray-800 pb-3">Upload New Video</h3>
          
          {error && (
            <div className="bg-red-950/20 border border-red-800 text-red-200 p-3 rounded text-xs">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="bg-green-950/20 border border-green-800 text-green-200 p-3 rounded text-xs">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-gray-100 focus:outline-none focus:border-yellow-400 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-gray-100 focus:outline-none focus:border-yellow-400 text-sm resize-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase mb-1">Course ID</label>
              <input
                type="text"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                placeholder="e.g. bitcoin-basics"
                className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-gray-100 focus:outline-none focus:border-yellow-400 text-sm"
                required
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is-free"
                checked={isFree}
                onChange={(e) => setIsFree(e.target.checked)}
                className="w-4 h-4 bg-gray-950 border-gray-800 rounded text-yellow-400 focus:ring-yellow-400"
              />
              <label htmlFor="is-free" className="text-xs font-bold text-gray-300 uppercase cursor-pointer">
                Is this a free sample?
              </label>
            </div>

            {!isFree && (
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-1">Price in Sats</label>
                <input
                  type="number"
                  value={priceSats}
                  onChange={(e) => setPriceSats(Math.max(0, parseInt(e.target.value) || 0))}
                  min={0}
                  className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-gray-100 focus:outline-none focus:border-yellow-400 text-sm font-mono"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase mb-1">Video File</label>
              <input
                type="file"
                id="video-file"
                accept="video/*"
                onChange={handleFileChange}
                className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-800 file:text-gray-250 hover:file:bg-gray-750 cursor-pointer file:cursor-pointer"
                required
              />
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-bold py-2.5 px-4 rounded transition-all disabled:opacity-50 text-sm cursor-pointer"
            >
              {uploading ? "Uploading Video..." : "Upload Video"}
            </button>
          </form>
        </div>

        {/* Video List */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 p-6 rounded-lg space-y-6">
          <h3 className="text-lg font-bold text-gray-100 border-b border-gray-800 pb-3">My Uploads</h3>
          
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              Loading creator videos...
            </div>
          ) : creatorVideos.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              You haven't uploaded any videos yet.
            </div>
          ) : (
            <div className="space-y-4">
              {creatorVideos.map((video) => (
                <div
                  key={video.id}
                  className="flex items-center justify-between p-4 bg-gray-950 border border-gray-850 rounded-lg hover:border-gray-800 transition-colors"
                >
                  <div className="space-y-1">
                    <h4 className="font-bold text-gray-200 text-sm">{video.title}</h4>
                    <div className="flex gap-4 text-xs text-gray-400 font-mono">
                      <span>Price: {video.isFree ? "Free" : `${video.priceSats} sats`}</span>
                      <span>Course: {video.courseId}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400 font-medium">Purchases</span>
                    <p className="text-lg font-bold text-yellow-400 font-mono">
                      {getMockPurchaseCount(video.id)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}