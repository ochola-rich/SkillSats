import { createFileRoute } from "@tanstack/react-router";
import html from "../screens/home.html";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SatsLearn — Learn anything. Pay in sats." },
      { name: "description", content: "Browse peer-to-peer courses on Bitcoin, dev, design, and more — paid in sats." },
      { property: "og:title", content: "SatsLearn — Learn anything. Pay in sats." },
      { property: "og:description", content: "Peer-to-peer Bitcoin Lightning education marketplace." },
    ],
  }),
  component: Index,
});

function Index() {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
