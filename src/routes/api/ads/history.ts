import { createFileRoute } from "@tanstack/react-router";

import { withApiErrors } from "@/lib/api.server";
import { getAdWatchHistory } from "@/server/ads";

export const Route = createFileRoute("/api/ads/history")({
  server: {
    handlers: {
      GET: async () =>
        withApiErrors(async () =>
          Response.json(await getAdWatchHistory(), {
            headers: { "Cache-Control": "private, no-store" },
          }),
        ),
    },
  },
});
