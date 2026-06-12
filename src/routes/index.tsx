import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listVideos } from "../server/videos";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SatsLearn — Learn anything. Pay in sats." },
      {
        name: "description",
        content: "Browse peer-to-peer courses on Bitcoin, dev, design, and more — paid in sats.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: videos, isLoading } = useQuery({
    queryKey: ["videos"],
    queryFn: () => listVideos(),
  });

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6 text-white">
      <header className="mb-10 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Explore Courses</h1>
        <p className="text-gray-400">
          Master new skills and pay creators directly with Bitcoin Lightning.
        </p>
      </header>

      <div className="max-w-7xl mx-auto">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-[#111118] border border-white/10 rounded-xl p-4 animate-pulse"
              >
                <div className="bg-[#16161f] h-36 rounded-lg mb-4" />
                <div className="h-6 bg-[#16161f] rounded w-3/4 mb-2" />
                <div className="h-4 bg-[#16161f] rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos?.map(
              (video: {
                id: string;
                title: string;
                isFree: boolean;
                priceSats: number;
                creatorUsername: string;
                description: string;
              }) => (
                <Link
                  key={video.id}
                  to="/learn/$videoId"
                  params={{ videoId: video.id }}
                  className="bg-[#111118] border border-white/10 rounded-xl p-4 hover:border-yellow-500/40 transition-colors cursor-pointer group"
                >
                  <div className="bg-[#16161f] h-36 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
                    <span className="material-symbols-outlined text-4xl text-white/20 group-hover:scale-110 transition-transform">
                      play_circle
                    </span>
                  </div>
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-white text-lg line-clamp-1">{video.title}</h3>
                    {video.isFree ? (
                      <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                        FREE
                      </span>
                    ) : (
                      <span className="text-yellow-500 font-mono text-sm">
                        ⚡ {video.priceSats} sats
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm mb-4">by @{video.creatorUsername}</p>
                  <p className="text-gray-500 text-xs line-clamp-2">{video.description}</p>
                </Link>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
