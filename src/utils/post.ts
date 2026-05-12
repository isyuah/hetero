import type { InferEntrySchema } from "astro:content";
import { statSync } from "node:fs";

interface WithFilePath {
  filePath?: string;
  data: InferEntrySchema<"posts">,
}

interface WithDateTime {
  time: {
    updatedAt: number,
    createdAt: number,
  }
}

export const getPostCollectionWithDate = <T extends WithFilePath>(posts: T[]): (T & WithDateTime)[] => {
  return posts.map(p => {
    const fp = p.filePath!;
    const stats = statSync(fp);
    return {
      ...p,
      time: {
        createdAt: p.data.createdAt?.getTime() ?? stats.birthtime?.getTime(),
        updatedAt: p.data.updatedAt?.getTime() ?? stats.mtime?.getTime(),
      }
    }
  })
}