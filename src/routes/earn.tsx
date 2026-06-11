import { createFileRoute } from "@tanstack/react-router";
import html from "../screens/earn.html";

export const Route = createFileRoute("/earn")({
  head: () => ({
    meta: [
      { title: "SatsLearn — Earn Sats" },
      { name: "description", content: "Watch curated ads, learn, and stack sats instantly via Lightning." },
      { property: "og:title", content: "Earn Sats — SatsLearn" },
      { property: "og:description", content: "Get paid to pay attention. High-quality education powered by Bitcoin." },
    ],
  }),
  component: () => <div dangerouslySetInnerHTML={{ __html: html }} />,
});