import type { APIRoute } from "astro";
import { getGitHubRepoPreview, parseGitHubRepoInput } from "@/utils/githubRepo";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const owner = url.searchParams.get("owner") ?? undefined;
  const repo = url.searchParams.get("repo") ?? undefined;
  const repoUrl = url.searchParams.get("url") ?? undefined;
  const input = { owner, repo, url: repoUrl };

  if (!parseGitHubRepoInput(input)) {
    return json({
      ok: false,
      error: "A GitHub repo is required. Use repo=owner/name or owner/name params.",
    }, 400);
  }

  const preview = await getGitHubRepoPreview(input);

  if (!preview) {
    return json({
      ok: false,
      error: "GitHub repository data is unavailable.",
    }, 502, {
      "Cache-Control": "public, max-age=60",
    });
  }

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
