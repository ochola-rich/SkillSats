import { createFileRoute } from "@tanstack/react-router";

import { withApiErrors } from "@/lib/api.server";
import { getMe } from "@/server/auth";

export const Route = createFileRoute("/api/auth/me")({
  server: {
    handlers: {
      GET: async () =>
        withApiErrors(async () =>
          Response.json(await getMe(), {
            headers: { "Cache-Control": "private, no-store" },
          }),
        ),
    },
  },
});
