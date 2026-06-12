import { createFileRoute } from "@tanstack/react-router";

import { readJson, requireSameOrigin, withApiErrors } from "@/lib/api.server";
import { createAdSchema } from "@/lib/schemas";
import { createAd } from "@/server/ads";

export const Route = createFileRoute("/api/ads")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        withApiErrors(async () => {
          requireSameOrigin(request);
          const data = createAdSchema.parse(await readJson(request));
          const ad = await createAd({ data });
          return Response.json(ad, { status: 201 });
        }),
    },
  },
});
