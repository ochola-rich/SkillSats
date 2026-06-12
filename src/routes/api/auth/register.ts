import { createFileRoute } from "@tanstack/react-router";

import { readJson, requireSameOrigin, withApiErrors } from "@/lib/api.server";
import { registerSchema } from "@/lib/schemas";
import { registerUser } from "@/server/auth";

export const Route = createFileRoute("/api/auth/register")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        withApiErrors(async () => {
          requireSameOrigin(request);
          const data = registerSchema.parse(await readJson(request));
          const user = await registerUser({ data });
          return Response.json(user, { status: 201 });
        }),
    },
  },
});
