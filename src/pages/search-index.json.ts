import { getCollection } from "astro:content";
import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  const [blog, projects, notes] = await Promise.all([
    getCollection("blog", ({ data }) => !data.draft),
    getCollection("projects"),
    getCollection("notes", ({ data }) => !data.draft),
  ]);

  const items = [
    ...blog.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      url: `/blog/${p.id}`,
      section: "Blog",
    })),
    ...projects.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      url: `/projects`,
      section: "Projects",
    })),
    ...notes.map((n) => ({
      title: n.data.title,
      description: n.data.description,
      url: `/notes/${n.id}`,
      section: "Notes",
    })),
  ];

  return new Response(JSON.stringify(items), {
    headers: { "Content-Type": "application/json" },
  });
};
