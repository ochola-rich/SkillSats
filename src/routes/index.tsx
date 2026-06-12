import { createFileRoute, Link } from "@tanstack/react-router";

import { listVideos } from "../server/videos";

export const Route = createFileRoute("/")({
  loader: () => listVideos(),
  head: () => ({
    meta: [
      { title: "SkillSats - Learn anything. Pay in sats." },
      {
        name: "description",
        content: "Browse peer-to-peer courses paid for with Bitcoin Lightning.",
      },
    ],
  }),
  component: CourseBrowser,
});

function CourseBrowser() {
  const videos = Route.useLoaderData();

  return (
    <div className="space-y-10">
      <section className="mx-auto max-w-2xl py-12 text-center">
        <h1 className="text-4xl font-bold leading-tight md:text-5xl">
          Learn anything. <span className="text-yellow-400">Pay in sats.</span>
        </h1>
        <p className="mt-4 text-lg text-gray-400">
          Practical courses from independent creators, unlocked over Bitcoin Lightning.
        </p>
      </section>

      <section>
        <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
          <h2 className="text-xl font-bold">Available videos</h2>
          <span className="font-mono text-xs text-gray-500">{videos.length} published</span>
        </div>

        {videos.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#111118] p-10 text-center text-gray-400">
            No videos have been published yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <Link
                key={video.id}
                to="/learn/$videoId"
                params={{ videoId: video.id }}
                className="group overflow-hidden rounded-xl border border-white/10 bg-[#111118] transition-colors hover:border-yellow-500/40"
              >
                <div className="flex h-36 items-center justify-center bg-[#16161f] text-3xl font-bold text-yellow-400">
                  SkillSats
                </div>
                <div className="space-y-4 p-4">
                  <div>
                    <h3 className="font-bold text-white group-hover:text-yellow-400">
                      {video.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-400">@{video.creatorUsername}</p>
                  </div>
                  {video.isFree ? (
                    <span className="inline-flex rounded bg-green-500/20 px-2 py-1 text-xs font-bold text-green-400">
                      FREE
                    </span>
                  ) : (
                    <span className="font-mono text-sm font-bold text-yellow-400">
                      {video.priceSats.toLocaleString()} sats
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
