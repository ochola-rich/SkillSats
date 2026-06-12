import { createFileRoute } from "@tanstack/react-router";

import { readJson, requireSameOrigin, withApiErrors } from "@/lib/api.server";
import { withdrawSchema } from "@/lib/schemas";
import { withdrawFunds } from "@/server/wallet";

export const Route = createFileRoute("/api/wallet/withdraw")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        withApiErrors(async () => {
          requireSameOrigin(request);
          const data = withdrawSchema.parse(await readJson(request));
          return Response.json(await withdrawFunds({ data }));
        }),
    },
  },
});
