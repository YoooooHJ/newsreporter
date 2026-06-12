const NOT_FOUND_PATTERNS = [
  /원하시는 페이지를 찾을 수/i,
  /페이지를 찾을 수 없/i,
  /페이지가 존재하지 않/i,
  /page not found/i,
  /404 error/i,
  /error 404/i,
];

const SKIP_URL_PATTERNS = [
  /^https?:\/\/(www\.)?google\./i,
  /^https?:\/\/vertexaisearch\.cloud\.google\.com/i,
];

function isSkippableUrl(url: string): boolean {
  return SKIP_URL_PATTERNS.some((pattern) => pattern.test(url));
}

export async function resolveAndValidateUrl(
  url: string
): Promise<{ valid: boolean; finalUrl: string }> {
  if (isSkippableUrl(url)) {
    return { valid: false, finalUrl: url };
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; NewsReporter/1.0; +https://news-reporter.app)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    const finalUrl = response.url;

    if (isSkippableUrl(finalUrl)) {
      return { valid: false, finalUrl };
    }

    if (!response.ok) {
      return { valid: false, finalUrl };
    }

    const html = (await response.text()).slice(0, 80_000);

    if (NOT_FOUND_PATTERNS.some((pattern) => pattern.test(html))) {
      return { valid: false, finalUrl };
    }

    return { valid: true, finalUrl };
  } catch {
    return { valid: false, finalUrl: url };
  }
}

export async function filterValidArticles<
  T extends { title: string; url: string },
>(articles: T[]): Promise<T[]> {
  const results = await Promise.all(
    articles.map(async (article) => {
      const { valid, finalUrl } = await resolveAndValidateUrl(article.url);
      if (!valid) return null;
      return { ...article, url: finalUrl };
    })
  );

  return results.filter((article): article is T => article !== null);
}
