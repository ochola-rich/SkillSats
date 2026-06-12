import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Upload Form State
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priceSats: 0,
    isFree: false,
    courseId: "",
    file: null,
  });
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchCreatorData();
  }, []);

  const fetchCreatorData = async () => {
    try {
      // Assuming backend returns creator's videos with purchase counts
      const { data } = await client.get("/api/videos?creatorId=me");
      setVideos(data);
    } catch (error) {
      console.error("Failed to load videos", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : type === "file" ? files[0] : value,
    }));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!formData.file) return alert("Please select a video file.");

    setIsUploading(true);
    const uploadData = new FormData();
    uploadData.append("title", formData.title);
    uploadData.append("description", formData.description);
    uploadData.append("priceSats", formData.priceSats);
    uploadData.append("isFree", formData.isFree);
    uploadData.append("courseId", formData.courseId);
    uploadData.append("file", formData.file);

    try {
      await client.post("/api/videos", uploadData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Video uploaded successfully!");
      fetchCreatorData(); // Refresh list
      // Reset form
      setFormData({
        title: "",
        description: "",
        priceSats: 0,
        isFree: false,
        courseId: "",
        file: null,
      });
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to upload video.");
    } finally {
      setIsUploading(false);
    }
  };

  const totalPurchases = videos.reduce((acc, v) => acc + (v._count?.purchases || 0), 0);

  if (loading) return <div className="p-8 text-white">Loading dashboard...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-white mb-6">Creator Dashboard</h1>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg">
          <p className="text-gray-400 text-sm font-medium mb-1">Total Balance</p>
          <p className="text-4xl font-bold text-yellow-400">
            ⚡ {user?.balanceSats?.toLocaleString() || 0}
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg">
          <p className="text-gray-400 text-sm font-medium mb-1">Videos Uploaded</p>
          <p className="text-3xl font-bold text-white">{videos.length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg">
          <p className="text-gray-400 text-sm font-medium mb-1">Total Purchases</p>
          <p className="text-3xl font-bold text-white">{totalPurchases}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Form */}
        <div className="lg:col-span-1 bg-gray-900 border border-gray-800 p-6 rounded-lg h-fit">
          <h2 className="text-xl font-bold text-white mb-4">Upload New Video</h2>
          <form onSubmit={handleUpload} className="space-y-4 text-white">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Title</label>
              <input
                required
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full bg-gray-950 border border-gray-800 rounded p-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <textarea
                required
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full bg-gray-950 border border-gray-800 rounded p-2"
                rows="3"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Course ID</label>
              <input
                required
                type="text"
                name="courseId"
                value={formData.courseId}
                onChange={handleInputChange}
                className="w-full bg-gray-950 border border-gray-800 rounded p-2"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm text-gray-400 mb-1">Price (Sats)</label>
                <input
                  type="number"
                  name="priceSats"
                  value={formData.priceSats}
                  onChange={handleInputChange}
                  disabled={formData.isFree}
                  className="w-full bg-gray-950 border border-gray-800 rounded p-2 disabled:opacity-50"
                />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  name="isFree"
                  id="isFree"
                  checked={formData.isFree}
                  onChange={handleInputChange}
                  className="w-4 h-4"
                />
                <label htmlFor="isFree" className="text-sm">
                  Free Sample?
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Video File</label>
              <input
                required
                type="file"
                accept="video/*"
                name="file"
                onChange={handleInputChange}
                className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-gray-800 file:text-white"
              />
            </div>
            <button
              disabled={isUploading}
              type="submit"
              className="w-full bg-yellow-400 text-gray-950 font-bold py-2 rounded hover:bg-yellow-500 disabled:opacity-50"
            >
              {isUploading ? "Uploading..." : "Upload Video"}
            </button>
          </form>
        </div>

        {/* Video List */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold text-white mb-4">Your Content</h2>
          {videos.length === 0 ? (
            <p className="text-gray-400">No videos uploaded yet.</p>
          ) : (
            <div className="space-y-4">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="flex items-center justify-between p-4 bg-gray-950 border border-gray-800 rounded-lg"
                >
                  <div>
                    <h3 className="font-bold text-white">{video.title}</h3>
                    <p className="text-sm text-gray-400">Course: {video.courseId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-yellow-400 font-bold">
                      {video.isFree ? "FREE" : `${video.priceSats} sats`}
                    </p>
                    <p className="text-sm text-gray-400">
                      {video._count?.purchases || 0} purchases
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
