import { createFileRoute } from "@tanstack/react-router";

import { requireSameOrigin, withApiErrors } from "@/lib/api.server";
import { logoutUser } from "@/server/auth";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        withApiErrors(async () => {
          requireSameOrigin(request);
          return Response.json(await logoutUser());
        }),
    },
  },
});
