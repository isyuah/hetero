import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const posts = defineCollection({
  loader: glob({
    pattern: "**/*.mdx",
    base: "./src/posts"
  }),
  schema: z.object({
    title: z.string(),
    cover: z.string().optional(),
    showCoverInPost: z.boolean().default(false),
    desc: z.string().default("暂无描述"),
    draft: z.boolean().default(false),
    showInPosts: z.boolean().default(true),
    tags: z.array(z.string()).default([]),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
  })
})

export const collections = { posts }
