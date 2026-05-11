import type { InferEntrySchema } from "astro:content";
import { statSync } from "node:fs";
import path from "node:path"

interface WithFilePath {
  filePath?: string;
  data: InferEntrySchema<"posts">,
}

interface WithDateTime {
  time: {
    updatedAt: Date,
    createdAt: Date,
  }
}

export const getPostCollectionWithDate = <T extends WithFilePath>(posts: T[]): (T & WithDateTime)[] => {
  return posts.map(p => {
    const fp = p.filePath!;
    const stats = statSync(fp);
    return {
      ...p,
      time: {
        createdAt: p.data.createdAt ?? stats.birthtime,
        updatedAt: p.data.updatedAt ?? stats.mtime,
      }
    }
  })
}