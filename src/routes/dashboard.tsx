import { createFileRoute } from "@tanstack/react-router";
import html from "../screens/dashboard.html";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "SatsLearn Creator Dashboard" },
      { name: "description", content: "Track your courses, earnings, and learners." },
      { property: "og:title", content: "Creator Dashboard — SatsLearn" },
      { property: "og:description", content: "Track your courses, earnings, and learners." },
    ],
  }),
  component: () => <div dangerouslySetInnerHTML={{ __html: html }} />,
});