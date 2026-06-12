const NOT_FOUND_PATTERNS = [
  /원하시는 페이지를 찾을 수/i,
  /페이지를 찾을 수 없/i,
  /페이지가 존재하지 않/i,
  /page not found/i,
];

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
};

export type PageMetadata = {
  valid: boolean;
  url: string;
  title: string | null;
  imageUrl: string | null;
};

function extractMetaContent(html: string, property: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`,
      "i"
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtmlEntities(match[1].trim());
  }

  return null;
}

function extractCanonical(html: string): string | null {
  const match = html.match(
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i
  );
  return match?.[1] ? decodeHtmlEntities(match[1].trim()) : null;
}

function extractTitleTag(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1] ? decodeHtmlEntities(match[1].trim()) : null;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function resolveUrl(base: string, relative: string): string {
  try {
    return new URL(relative, base).href;
  } catch {
    return relative;
  }
}

function isLikelyLogoImage(imageUrl: string): boolean {
  const lower = imageUrl.toLowerCase();
  return (
    lower.includes("logo") ||
    lower.includes("favicon") ||
    lower.includes("icon_") ||
    lower.endsWith(".ico")
  );
}

function pickBestUrl(
  canonical: string | null,
  ogUrl: string | null,
  finalUrl: string
): string {
  for (const candidate of [canonical, ogUrl, finalUrl]) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      if (url.protocol.startsWith("http") && !url.hostname.includes("google.")) {
        return url.href;
      }
    } catch {
      continue;
    }
  }
  return finalUrl;
}

function pickBestTitle(
  ogTitle: string | null,
  fallbackTitle: string | undefined,
  titleTag: string | null
): string | null {
  const candidates = [ogTitle, fallbackTitle, titleTag];
  for (const title of candidates) {
    const trimmed = title?.trim();
    if (trimmed && trimmed.length > 3) {
      return trimmed.replace(/\s*\|\s*.+$/, "").trim();
    }
  }
  return null;
}

export async function fetchPageMetadata(
  inputUrl: string,
  fallbackTitle?: string
): Promise<PageMetadata> {
  try {
    const response = await fetch(inputUrl, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: FETCH_HEADERS,
    });

    const finalUrl = response.url;

    if (!response.ok) {
      return { valid: false, url: finalUrl, title: null, imageUrl: null };
    }

    const html = (await response.text()).slice(0, 120_000);

    if (NOT_FOUND_PATTERNS.some((pattern) => pattern.test(html))) {
      return { valid: false, url: finalUrl, title: null, imageUrl: null };
    }

    const canonical = extractCanonical(html);
    const ogUrl = extractMetaContent(html, "og:url");
    const ogTitle = extractMetaContent(html, "og:title");
    const titleTag = extractTitleTag(html);

    const url = pickBestUrl(canonical, ogUrl, finalUrl);
    const title = pickBestTitle(ogTitle, fallbackTitle, titleTag);

    let imageUrl =
      extractMetaContent(html, "og:image") ||
      extractMetaContent(html, "twitter:image");

    if (imageUrl) {
      imageUrl = resolveUrl(url, imageUrl);
      if (isLikelyLogoImage(imageUrl)) {
        imageUrl = null;
      }
    }

    return { valid: true, url, title, imageUrl };
  } catch {
    return { valid: false, url: inputUrl, title: null, imageUrl: null };
  }
}

export async function enrichArticles<
  T extends { title: string; url: string },
>(articles: T[]): Promise<Array<T & { imageUrl: string | null }>> {
  const results = await Promise.all(
    articles.map(async (article) => {
      const meta = await fetchPageMetadata(article.url, article.title);
      if (!meta.valid || !meta.title) return null;

      return {
        ...article,
        title: meta.title,
        url: meta.url,
        imageUrl: meta.imageUrl,
      };
    })
  );

  return results.filter(
    (article): article is T & { imageUrl: string | null } => article !== null
  );
}
