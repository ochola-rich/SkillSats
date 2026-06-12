import { createFileRoute } from "@tanstack/react-router";

import { withApiErrors } from "@/lib/api.server";
import { getBalance } from "@/server/wallet";

export const Route = createFileRoute("/api/wallet/balance")({
  server: {
    handlers: {
      GET: async () => withApiErrors(async () => Response.json(await getBalance())),
    },
  },
});
