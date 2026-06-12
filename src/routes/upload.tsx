import { createFileRoute } from "@tanstack/react-router";
import html from "../screens/upload.html";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "SkillSats — Upload Course" },
      { name: "description", content: "Publish a new course and earn sats." },
      { property: "og:title", content: "Upload Course — SkillSats" },
      { property: "og:description", content: "Publish a new course and start earning in sats." },
    ],
  }),
  component: () => <div dangerouslySetInnerHTML={{ __html: html }} />,
});
