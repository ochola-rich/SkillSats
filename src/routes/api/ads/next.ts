import { createFileRoute } from "@tanstack/react-router";

import { withApiErrors } from "@/lib/api.server";
import { getNextAd } from "@/server/ads";

export const Route = createFileRoute("/api/ads/next")({
  server: {
    handlers: {
      GET: async () =>
        withApiErrors(async () => {
          const ad = await getNextAd();
          return ad
            ? Response.json(ad, { headers: { "Cache-Control": "private, no-store" } })
            : new Response(null, {
                status: 204,
                headers: { "Cache-Control": "private, no-store" },
              });
        }),
    },
  },
});
