import { createFileRoute } from "@tanstack/react-router";

import { readJson, requireSameOrigin, withApiErrors } from "@/lib/api.server";
import { createVideoSchema } from "@/lib/schemas";
import { createVideo, listVideos } from "@/server/videos";

export const Route = createFileRoute("/api/videos")({
  server: {
    handlers: {
      GET: async () => withApiErrors(async () => Response.json(await listVideos())),
      POST: async ({ request }) =>
        withApiErrors(async () => {
          requireSameOrigin(request);
          const data = createVideoSchema.parse(await readJson(request));
          const video = await createVideo({ data });
          return Response.json(video, { status: 201 });
        }),
    },
  },
});
