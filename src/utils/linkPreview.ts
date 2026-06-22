export interface LinkPreview {
  url: string;
  finalUrl: string;
  title?: string;
  desc?: string;
  icon?: string;
  image?: string;
  siteName?: string;
}

interface LinkPreviewOptions {
  timeoutMs?: number;
  maxBytes?: number;
  allowPrivateHosts?: boolean;
}

const DEFAULT_TIMEOUT_MS = 7000;
const DEFAULT_MAX_BYTES = 256 * 1024;

export function normalizeHttpUrl(input: string): URL | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const candidate = trimmed.startsWith("//")
    ? `https:${trimmed}`
    : /^[a-z][a-z\d+.-]*:/i.test(trimmed)
      ? trimmed
      : /^[\w.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(trimmed)
        ? `https://${trimmed}`
        : trimmed;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

export function getUrlHostLabel(input: string) {
  const url = normalizeHttpUrl(input);
  if (!url) return input;
  return url.hostname.replace(/^www\./, "");
}

export function resolveUrl(value: string | undefined, base: string) {
  if (!value) return undefined;
  try {
    return new URL(value, base).toString();
  } catch {
    return undefined;
  }
}

export async function getLinkPreview(
  input: string,
  options: LinkPreviewOptions = {},
): Promise<LinkPreview> {
  const url = normalizeHttpUrl(input);
  const fallbackTitle = getUrlHostLabel(input);

  if (!url) {
    return {
      url: input,
      finalUrl: input,
      title: fallbackTitle,
    };
  }

  const faviconFallback = `${url.origin}/favicon.ico`;
  const fallback: LinkPreview = {
    url: input,
    finalUrl: url.toString(),
    title: fallbackTitle,
    icon: faviconFallback,
  };

  if (!options.allowPrivateHosts && isPrivateHost(url.hostname)) {
    return fallback;
  }

  const timeout = createTimeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "HeteroLinkPreview/1.0",
      },
      signal: timeout.signal,
    });

    const finalUrl = response.url || url.toString();
    const contentType = response.headers.get("content-type") ?? "";
    const finalOrigin = new URL(finalUrl).origin;

    if (!response.ok || !contentType.includes("text/html")) {
      return {
        ...fallback,
        finalUrl,
        icon: `${finalOrigin}/favicon.ico`,
      };
    }

    const html = await readLimitedText(response, options.maxBytes ?? DEFAULT_MAX_BYTES);
    const meta = extractPageMeta(html, finalUrl);

    return {
      url: input,
      finalUrl,
      title: meta.title || fallbackTitle,
      desc: meta.desc,
      icon: meta.icon ?? `${finalOrigin}/favicon.ico`,
      image: meta.image,
      siteName: meta.siteName,
    };
  } catch {
    return fallback;
  } finally {
    timeout.cancel();
  }
}

function createTimeout(ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  return {
    signal: controller.signal,
    cancel: () => clearTimeout(timer),
  };
}

async function readLimitedText(response: Response, maxBytes: number) {
  const reader = response.body?.getReader();
  if (!reader) {
    return (await response.text()).slice(0, maxBytes);
  }

  const decoder = new TextDecoder();
  let received = 0;
  let result = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    received += value.byteLength;

    if (received > maxBytes) {
      const keep = Math.max(0, value.byteLength - (received - maxBytes));
      result += decoder.decode(value.slice(0, keep), { stream: true });
      await reader.cancel();
      break;
    }

    result += decoder.decode(value, { stream: true });
  }

  result += decoder.decode();
  return result;
}

function extractPageMeta(html: string, baseUrl: string) {
  const title =
    getMetaContent(html, ["og:title", "twitter:title"]) ??
    getTitle(html);
  const desc = getMetaContent(html, [
    "description",
    "og:description",
    "twitter:description",
  ]);
  const image = resolveUrl(
    getMetaContent(html, ["og:image", "twitter:image"]),
    baseUrl,
  );
  const siteName = getMetaContent(html, ["og:site_name", "application-name"]);
  const icon = getFavicon(html, baseUrl);

  return {
    title: cleanText(title),
    desc: cleanText(desc),
    image,
    siteName: cleanText(siteName),
    icon,
  };
}

function getTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1] ? decodeHtml(match[1]) : undefined;
}

function getMetaContent(html: string, keys: string[]) {
  const wanted = new Set(keys.map((key) => key.toLowerCase()));

  for (const attrs of getTagAttrs(html, "meta")) {
    const key = (attrs.property ?? attrs.name ?? "").toLowerCase();
    if (wanted.has(key) && attrs.content) {
      return decodeHtml(attrs.content);
    }
  }

  return undefined;
}

function getFavicon(html: string, baseUrl: string) {
  const candidates = getTagAttrs(html, "link")
    .map((attrs) => {
      const rel = (attrs.rel ?? "").toLowerCase();
      const href = attrs.href;
      if (!href || !rel.includes("icon")) return null;

      const score =
        rel.includes("apple-touch-icon") ? 3 :
        rel.includes("shortcut") ? 2 :
        1;

      return {
        score,
        href: resolveUrl(href, baseUrl),
      };
    })
    .filter((candidate): candidate is { score: number; href: string } => {
      return Boolean(candidate?.href);
    })
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.href;
}

function getTagAttrs(html: string, tagName: string) {
  const tagRegex = new RegExp(`<${tagName}\\s+([^>]*?)>`, "gi");
  const attrs: Record<string, string>[] = [];
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(html))) {
    attrs.push(parseAttrs(match[1] ?? ""));
  }

  return attrs;
}

function parseAttrs(source: string) {
  const attrRegex = /([:@\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>=`]+))/g;
  const attrs: Record<string, string> = {};
  let match: RegExpExecArray | null;

  while ((match = attrRegex.exec(source))) {
    const key = match[1]?.toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    if (key) attrs[key] = decodeHtml(value);
  }

  return attrs;
}

function decodeHtml(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value
    .replace(/&#x([\da-f]+);/gi, (_, hex: string) => {
      return String.fromCodePoint(Number.parseInt(hex, 16));
    })
    .replace(/&#(\d+);/g, (_, code: string) => {
      return String.fromCodePoint(Number.parseInt(code, 10));
    })
    .replace(/&([a-z]+);/gi, (entity, key: string) => named[key] ?? entity);
}

function cleanText(value: string | undefined) {
  return value?.replace(/\s+/g, " ").trim() || undefined;
}

function isPrivateHost(hostname: string) {
  const host = hostname.toLowerCase();

  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".localhost")
  ) {
    return true;
  }

  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) {
    return true;
  }

  const match = host.match(/^172\.(\d+)\./);
  if (match) {
    const second = Number(match[1]);
    return second >= 16 && second <= 31;
  }

  return false;
}
