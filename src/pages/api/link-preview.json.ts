import type { APIRoute } from "astro";
import { getLinkPreview, normalizeHttpUrl } from "@/utils/linkPreview";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const target = url.searchParams.get("url");

  if (!target || !normalizeHttpUrl(target)) {
    return json({
      ok: false,
      error: "A valid http(s) url is required.",
    }, 400);
  }

  const preview = await getLinkPreview(target, {
    allowPrivateHosts: false,
  });

  return json({
    ok: true,
    data: preview,
  }, 200, {
    "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
  });
};

function json(body: unknown, status: number, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}
