import { createFileRoute } from "@tanstack/react-router";
import html from "../screens/course.html";

export const Route = createFileRoute("/course")({
  head: () => ({
    meta: [
      { title: "SatsLearn — Course" },
      { name: "description", content: "Watch the course and unlock with sats." },
      { property: "og:title", content: "Course — SatsLearn" },
      { property: "og:description", content: "Bitcoin Lightning education, unlocked with sats." },
    ],
  }),
  component: () => <div dangerouslySetInnerHTML={{ __html: html }} />,
});
