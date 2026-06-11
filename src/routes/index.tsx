import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { apiClient } from "../api/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SatsLearn — Learn anything. Pay in sats." },
      { name: "description", content: "Browse peer-to-peer courses on Bitcoin, dev, design, and more — paid in sats." },
    ],
  }),
  component: IndexComponent,
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

function IndexComponent() {
  const [videos, setVideos] = useState<VideoSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get<VideoSummary[]>("/api/videos");
        setVideos(res.data);
      } catch (err: any) {
        console.error(err);
        setError("Failed to fetch courses. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  return (
    <div className="space-y-8">
      {/* Hero / Introduction */}
      <section className="text-center py-12 md:py-16 space-y-4 max-w-2xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-100 leading-tight">
          Learn anything. <br />
          <span className="text-yellow-400">Pay in sats.</span>
        </h1>
        <p className="text-gray-400 text-lg">
          The peer-to-peer education platform powered by the Bitcoin Lightning Network. Master new skills or share your expertise.
        </p>
      </section>

      {/* Course List Section */}
      <div className="space-y-6">
        <div className="flex justify-between items-center border-b border-gray-800 pb-4">
          <h2 className="text-xl font-bold text-gray-200">Available Courses</h2>
          <span className="text-xs text-gray-500 font-mono">{videos.length} videos found</span>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20 text-gray-400">
            <span>Loading courses...</span>
          </div>
        ) : error ? (
          <div className="bg-red-950/20 border border-red-800 text-red-200 p-4 rounded-lg text-sm text-center">
            {error}
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg">No courses published yet.</p>
            <p className="text-sm mt-1">Check back later or upload your own!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <Link
                key={video.id}
                to="/learn/$videoId"
                params={{ videoId: video.id }}
                className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden group hover:border-yellow-400 transition-all flex flex-col h-full cursor-pointer"
              >
                {/* Thumbnail Placeholder */}
                <div className="h-40 bg-gray-950 flex items-center justify-center border-b border-gray-800/50 group-hover:bg-gray-900 transition-colors">
                  <span className="text-4xl text-gray-650 group-hover:text-yellow-400 transition-colors font-extrabold">⚡</span>
                </div>
                
                {/* Content */}
                <div className="p-4 flex flex-col justify-between flex-grow space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-bold text-gray-200 line-clamp-2 group-hover:text-yellow-400 transition-colors text-sm">
                      {video.title}
                    </h3>
                    <p className="text-xs text-gray-400">
                      @{video.creatorUsername || "creator"}
                    </p>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2">
                    {video.priceSats === 0 || video.isFree ? (
                      <span className="bg-green-950 text-green-400 border border-green-850 px-2 py-0.5 rounded text-xs font-bold font-mono">
                        FREE
                      </span>
                    ) : (
                      <span className="text-yellow-400 font-bold font-mono text-xs flex items-center gap-0.5">
                        ⚡ {(video.priceSats || 0).toLocaleString()} sats
                      </span>
                    )}
                    <span className="text-xs text-gray-555 group-hover:translate-x-1 transition-transform">
                      →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

