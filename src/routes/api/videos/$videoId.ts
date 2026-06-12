import { createFileRoute } from "@tanstack/react-router";

import { withApiErrors } from "@/lib/api.server";
import { videoIdSchema } from "@/lib/schemas";
import { getVideoMeta } from "@/server/videos";

export const Route = createFileRoute("/api/videos/$videoId")({
  server: {
    handlers: {
      GET: async ({ params }) =>
        withApiErrors(async () => {
          const data = videoIdSchema.parse({ videoId: params.videoId });
          return Response.json(await getVideoMeta({ data }));
        }),
    },
  },
});
