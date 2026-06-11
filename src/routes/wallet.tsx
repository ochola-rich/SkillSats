import { createFileRoute } from "@tanstack/react-router";
import html from "../screens/wallet.html";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "SatsLearn Wallet — Bitcoin Lightning" },
      { name: "description", content: "Manage your sats balance and Lightning transactions." },
      { property: "og:title", content: "Wallet — SatsLearn" },
      { property: "og:description", content: "Manage your earnings and Lightning transactions." },
    ],
  }),
  component: () => <div dangerouslySetInnerHTML={{ __html: html }} />,
});