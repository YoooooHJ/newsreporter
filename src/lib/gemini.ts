import { GoogleGenAI, type GroundingMetadata } from "@google/genai";
import { getGeminiApiKey } from "./env";
import { fetchOgImages } from "./og-image";
import { buildNewsSearchPrompt } from "./report-prompt";
import { filterValidArticles } from "./url-validator";

export type NewsItem = {
  title: string;
  url: string;
  imageUrl: string | null;
};

type RawArticle = {
  title?: string;
  url?: string;
};

type ValidArticle = {
  title: string;
  url: string;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function extractResponseText(
  response: Awaited<
    ReturnType<InstanceType<typeof GoogleGenAI>["models"]["generateContent"]>
  >
): string {
  if (response.text) return response.text;

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) return "";

  return parts
    .map((part) => ("text" in part && part.text ? part.text : ""))
    .join("");
}

function titleFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "뉴스 기사";
  }
}

function isDirectNewsUrl(url: string): boolean {
  try {
    const { hostname, pathname } = new URL(url);
    if (hostname.includes("google.")) return false;
    if (hostname.includes("vertexaisearch.cloud.google.com")) return false;
    return pathname.length > 1;
  } catch {
    return false;
  }
}

function extractFromGrounding(metadata: GroundingMetadata | undefined): RawArticle[] {
  if (!metadata?.groundingChunks) return [];

  const articles: RawArticle[] = [];

  for (const chunk of metadata.groundingChunks) {
    if (chunk.web?.uri && isDirectNewsUrl(chunk.web.uri)) {
      articles.push({
        title: chunk.web.title?.trim() || titleFromUrl(chunk.web.uri),
        url: chunk.web.uri,
      });
      continue;
    }

    if (
      chunk.retrievedContext?.uri &&
      isDirectNewsUrl(chunk.retrievedContext.uri)
    ) {
      articles.push({
        title:
          chunk.retrievedContext.title?.trim() ||
          titleFromUrl(chunk.retrievedContext.uri),
        url: chunk.retrievedContext.uri,
      });
    }
  }

  return articles;
}

function parseArticlesFromText(text: string): RawArticle[] {
  if (!text.trim()) return [];

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonCandidate = fenced?.[1]?.trim() ?? text.match(/\{[\s\S]*\}/)?.[0];

  if (!jsonCandidate) return [];

  try {
    const parsed = JSON.parse(jsonCandidate) as { articles?: RawArticle[] };
    return parsed.articles ?? [];
  } catch {
    return [];
  }
}

function dedupeArticles(articles: RawArticle[]): ValidArticle[] {
  const seen = new Set<string>();
  const result: ValidArticle[] = [];

  for (const article of articles) {
    const url = article.url?.trim();
    if (!url) continue;

    let normalizedUrl = url;
    try {
      normalizedUrl = new URL(url).href;
    } catch {
      continue;
    }

    if (!normalizedUrl.startsWith("http")) continue;
    if (!isDirectNewsUrl(normalizedUrl)) continue;
    if (seen.has(normalizedUrl)) continue;
    seen.add(normalizedUrl);

    const title = article.title?.trim() || titleFromUrl(normalizedUrl);
    result.push({ title, url: normalizedUrl });
  }

  return result;
}

export async function searchNews(keyword: string): Promise<NewsItem[]> {
  const apiKey = getGeminiApiKey();
  const ai = new GoogleGenAI({ apiKey });

  let response;
  try {
    response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: buildNewsSearchPrompt(keyword),
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
  } catch (error) {
    throw new Error(`Gemini API 호출 실패: ${getErrorMessage(error)}`);
  }

  const candidate = response.candidates?.[0];
  if (!candidate) {
    throw new Error("Gemini가 응답을 반환하지 않았습니다.");
  }

  if (candidate.finishReason && candidate.finishReason !== "STOP") {
    throw new Error(`Gemini 응답 중단: ${candidate.finishReason}`);
  }

  const text = extractResponseText(response);
  const parsed = parseArticlesFromText(text);
  const grounded = extractFromGrounding(candidate.groundingMetadata);

  // JSON 응답(Gemini가 검색 결과에서 복사한 URL)을 grounding 메타데이터보다 우선
  const merged = dedupeArticles([...parsed, ...grounded]);
  const rawArticles = await filterValidArticles(merged);

  if (rawArticles.length === 0) {
    throw new Error("유효한 뉴스 URL을 찾지 못했습니다. 다른 키워드로 시도해 주세요.");
  }

  let imageMap = new Map<string, string | null>();
  try {
    const urlsForImages = rawArticles.slice(0, 9).map((a) => a.url);
    imageMap = await fetchOgImages(urlsForImages);
  } catch (error) {
    console.warn("OG image fetch failed:", getErrorMessage(error));
  }

  return rawArticles.map((article) => ({
    title: article.title,
    url: article.url,
    imageUrl: imageMap.get(article.url) ?? null,
  }));
}
