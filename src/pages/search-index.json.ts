import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { getPostCollectionWithDate } from "@/utils/post";
import { pinyin } from "pinyin-pro";

export const prerender = true;

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

function toPinyinWords(text: string) {
  return pinyin(text, {
    toneType: "none",
    type: "array",
    nonZh: "consecutive",
    v: true,
  }).join(" ");
}

function toPinyinCompact(text: string) {
  return pinyin(text, {
    toneType: "none",
    type: "array",
    nonZh: "consecutive",
    v: true,
  }).join("");
}

function toInitials(text: string) {
  return pinyin(text, {
    pattern: "first",
    toneType: "none",
    type: "array",
    nonZh: "consecutive",
    v: true,
  }).join("");
}

export const GET: APIRoute = async () => {
  const rawPosts = await getCollection("posts", ({ data }) => {
    return !data.draft && data.showInPosts;
  });

  const posts = getPostCollectionWithDate(rawPosts);

  const index = posts.map((post) => {
    const title = post.data.title ?? "";
    const desc = post.data.desc ?? "";
    const tags = post.data.tags ?? [];
    const text = normalizeText([title, desc, tags.join(" ")].join(" "));

    return {
      id: post.id,
      title,
      desc,
      tags,
      url: `/posts/${post.id}`,
      date: post.time.createdAt,

      text,
      pinyin: toPinyinWords(text),
      pinyinCompact: toPinyinCompact(text),
      initials: toInitials(text),
    };
  });

  return new Response(JSON.stringify(index), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
};
