import { createFileRoute } from "@tanstack/react-router";

import { withApiErrors } from "@/lib/api.server";
import { invoiceStatusSchema } from "@/lib/schemas";
import { checkInvoiceStatus } from "@/server/payments";

export const Route = createFileRoute("/api/invoices/$rHash/status")({
  server: {
    handlers: {
      GET: async ({ params }) =>
        withApiErrors(async () => {
          const data = invoiceStatusSchema.parse({ rHash: params.rHash });
          return Response.json(await checkInvoiceStatus({ data }));
        }),
    },
  },
});
