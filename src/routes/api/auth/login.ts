import { createFileRoute } from "@tanstack/react-router";

import { readJson, requireSameOrigin, withApiErrors } from "@/lib/api.server";
import { loginSchema } from "@/lib/schemas";
import { loginUser } from "@/server/auth";

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        withApiErrors(async () => {
          requireSameOrigin(request);
          const data = loginSchema.parse(await readJson(request));
          return Response.json(await loginUser({ data }));
        }),
    },
  },
});
