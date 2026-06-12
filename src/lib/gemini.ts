import { GoogleGenAI, type GroundingMetadata } from "@google/genai";
import { getGeminiApiKey } from "./env";
import { enrichArticles } from "./page-metadata";
import { buildNewsSearchPrompt } from "./report-prompt";

export type NewsItem = {
  title: string;
  url: string;
  imageUrl: string | null;
};

type RawArticle = {
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

/** grounding 출처만 사용 — Gemini JSON URL은 hallucination 위험이 큼 */
function extractFromGrounding(metadata: GroundingMetadata | undefined): RawArticle[] {
  if (!metadata?.groundingChunks) return [];

  const articles: RawArticle[] = [];
  const seen = new Set<string>();

  for (const chunk of metadata.groundingChunks) {
    const uri = chunk.web?.uri || chunk.retrievedContext?.uri;
    if (!uri) continue;

    let normalized = uri;
    try {
      normalized = new URL(uri).href;
    } catch {
      continue;
    }

    if (seen.has(normalized)) continue;
    seen.add(normalized);

    const title =
      chunk.web?.title?.trim() ||
      chunk.retrievedContext?.title?.trim() ||
      titleFromUrl(normalized);

    articles.push({ title, url: normalized });
  }

  return articles;
}

/** JSON에서 title만 추출해 grounding title 보강용 */
function extractTitlesFromText(text: string): string[] {
  if (!text.trim()) return [];

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonCandidate = fenced?.[1]?.trim() ?? text.match(/\{[\s\S]*\}/)?.[0];
  if (!jsonCandidate) return [];

  try {
    const parsed = JSON.parse(jsonCandidate) as {
      articles?: Array<{ title?: string }>;
    };
    return (parsed.articles ?? [])
      .map((a) => a.title?.trim())
      .filter((t): t is string => Boolean(t));
  } catch {
    return [];
  }
}

function dedupeArticles(articles: RawArticle[]): RawArticle[] {
  const seen = new Set<string>();
  const result: RawArticle[] = [];

  for (const article of articles) {
    if (seen.has(article.url)) continue;
    seen.add(article.url);
    result.push(article);
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
  const grounded = extractFromGrounding(candidate.groundingMetadata);

  if (grounded.length === 0) {
    throw new Error("검색 출처를 찾지 못했습니다. 다른 키워드로 시도해 주세요.");
  }

  const jsonTitles = extractTitlesFromText(text);
  const merged = dedupeArticles(
    grounded.map((article, index) => ({
      ...article,
      title: jsonTitles[index] || article.title,
    }))
  );

  const enriched = await enrichArticles(merged.slice(0, 15));

  if (enriched.length === 0) {
    throw new Error("유효한 뉴스 URL을 찾지 못했습니다. 다른 키워드로 시도해 주세요.");
  }

  return enriched.map((article) => ({
    title: article.title,
    url: article.url,
    imageUrl: article.imageUrl,
  }));
}
