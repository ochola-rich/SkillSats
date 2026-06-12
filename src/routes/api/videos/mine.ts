import { createFileRoute } from "@tanstack/react-router";

import { withApiErrors } from "@/lib/api.server";
import { listMyVideos } from "@/server/videos";

export const Route = createFileRoute("/api/videos/mine")({
  server: {
    handlers: {
      GET: async () =>
        withApiErrors(async () =>
          Response.json(await listMyVideos(), {
            headers: { "Cache-Control": "private, no-store" },
          }),
        ),
    },
  },
});
