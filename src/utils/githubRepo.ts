export interface GitHubRepoRef {
  owner: string;
  repo: string;
  fullName: string;
  htmlUrl: string;
}

export interface GitHubRepoPreview extends GitHubRepoRef {
  description?: string;
  homepage?: string;
  language?: string;
  stargazersCount: number;
  forksCount: number;
  openIssuesCount: number;
  topics: string[];
  updatedAt?: string;
  pushedAt?: string;
  ownerAvatar?: string;
  archived: boolean;
  fork: boolean;
}

export interface GitHubRepoInput {
  owner?: string;
  repo?: string;
  url?: string;
}

interface GitHubRepoApiResponse {
  name?: string;
  full_name?: string;
  html_url?: string;
  description?: string | null;
  homepage?: string | null;
  language?: string | null;
  stargazers_count?: number;
  forks_count?: number;
  open_issues_count?: number;
  topics?: string[];
  updated_at?: string;
  pushed_at?: string;
  archived?: boolean;
  fork?: boolean;
  owner?: {
    login?: string;
    avatar_url?: string;
  };
}

interface GitHubRepoOptions {
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 7000;

export function parseGitHubRepoInput(input: GitHubRepoInput): GitHubRepoRef | null {
  const fromUrl = input.url ? parseGitHubUrl(input.url) : null;
  const rawOwner = input.owner?.trim();
  const rawRepo = input.repo?.trim();

  if (rawOwner && rawRepo) {
    return createRepoRef(rawOwner, rawRepo);
  }

  if (rawRepo?.includes("/")) {
    const [owner, repo] = rawRepo.split("/");
    return createRepoRef(owner, repo);
  }

  return fromUrl;
}

export async function getGitHubRepoPreview(
  input: GitHubRepoInput,
  options: GitHubRepoOptions = {},
): Promise<GitHubRepoPreview | null> {
  const ref = parseGitHubRepoInput(input);
  if (!ref) return null;

  const timeout = createTimeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}`,
      {
        headers: getGitHubHeaders(),
        signal: timeout.signal,
      },
    );

    if (!response.ok) return null;

    const data = await response.json() as GitHubRepoApiResponse;
    const fullName = data.full_name ?? ref.fullName;
    const [owner, repo] = fullName.split("/");

    return {
      owner: owner ?? ref.owner,
      repo: repo ?? data.name ?? ref.repo,
      fullName,
      htmlUrl: data.html_url ?? ref.htmlUrl,
      description: data.description ?? undefined,
      homepage: data.homepage || undefined,
      language: data.language ?? undefined,
      stargazersCount: data.stargazers_count ?? 0,
      forksCount: data.forks_count ?? 0,
      openIssuesCount: data.open_issues_count ?? 0,
      topics: data.topics ?? [],
      updatedAt: data.updated_at,
      pushedAt: data.pushed_at,
      ownerAvatar: data.owner?.avatar_url,
      archived: data.archived ?? false,
      fork: data.fork ?? false,
    };
  } catch {
    return null;
  } finally {
    timeout.cancel();
  }
}

export function formatCompactNumber(value: number | undefined) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value ?? 0);
}

export function formatRepoDate(value: string | undefined) {
  if (!value) return undefined;
  return new Date(value).toLocaleDateString("zh-CN");
}

function parseGitHubUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.hostname.toLowerCase() !== "github.com") return null;

    const [owner, repo] = url.pathname
      .split("/")
      .filter(Boolean);

    return createRepoRef(owner, repo);
  } catch {
    return null;
  }
}

function createRepoRef(owner: string | undefined, repo: string | undefined) {
  const safeOwner = owner?.trim();
  const safeRepo = repo?.trim().replace(/\.git$/i, "");

  if (!safeOwner || !safeRepo) return null;
  if (!/^[\w.-]+$/.test(safeOwner) || !/^[\w.-]+$/.test(safeRepo)) return null;

  return {
    owner: safeOwner,
    repo: safeRepo,
    fullName: `${safeOwner}/${safeRepo}`,
    htmlUrl: `https://github.com/${safeOwner}/${safeRepo}`,
  };
}

function getGitHubHeaders() {
  const token = getGitHubToken();
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    "user-agent": "HeteroGitHubRepoCard/1.0",
  };

  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  return headers;
}

function getGitHubToken() {
  const metaEnv = (import.meta as ImportMeta & {
    env?: Record<string, string | undefined>;
  }).env;
  const globalProcess = (globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  }).process;

  return metaEnv?.GITHUB_TOKEN ?? globalProcess?.env?.GITHUB_TOKEN;
}

function createTimeout(ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  return {
    signal: controller.signal,
    cancel: () => clearTimeout(timer),
  };
}
