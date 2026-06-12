import { createFileRoute } from "@tanstack/react-router";

import { requireSameOrigin, withApiErrors } from "@/lib/api.server";
import { adIdSchema } from "@/lib/schemas";
import { markAdWatched } from "@/server/ads";

export const Route = createFileRoute("/api/ads/$adId/watched")({
  server: {
    handlers: {
      POST: async ({ request, params }) =>
        withApiErrors(async () => {
          requireSameOrigin(request);
          const data = adIdSchema.parse({ adId: params.adId });
          return Response.json(await markAdWatched({ data }));
        }),
    },
  },
});
