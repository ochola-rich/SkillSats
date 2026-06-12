import { createFileRoute } from "@tanstack/react-router";

import { requireSameOrigin, withApiErrors } from "@/lib/api.server";
import { videoIdSchema } from "@/lib/schemas";
import { purchaseVideo } from "@/server/payments";

export const Route = createFileRoute("/api/videos/$videoId/purchase")({
  server: {
    handlers: {
      POST: async ({ request, params }) =>
        withApiErrors(async () => {
          requireSameOrigin(request);
          const data = videoIdSchema.parse({ videoId: params.videoId });
          const invoice = await purchaseVideo({ data });
          return Response.json(invoice, { status: 201 });
        }),
    },
  },
});
