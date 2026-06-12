import { createFileRoute } from "@tanstack/react-router";

import { withApiErrors } from "@/lib/api.server";
import { videoIdSchema } from "@/lib/schemas";
import { getVideoAccess } from "@/server/videos";

export const Route = createFileRoute("/api/videos/$videoId/access")({
  server: {
    handlers: {
      GET: async ({ params }) =>
        withApiErrors(async () => {
          const data = videoIdSchema.parse({ videoId: params.videoId });
          return Response.json(await getVideoAccess({ data }));
        }),
    },
  },
});
