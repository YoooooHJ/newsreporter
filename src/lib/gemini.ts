import { GoogleGenAI } from "@google/genai";
import { fetchOgImages } from "./og-image";
import { buildNewsSearchPrompt } from "./report-prompt";

export type NewsItem = {
  title: string;
  url: string;
  imageUrl: string | null;
};

type RawArticle = {
  title?: string;
  url?: string;
};

function extractFromGrounding(
  groundingMetadata: Record<string, unknown> | undefined
): RawArticle[] {
  if (!groundingMetadata) return [];

  const chunks = groundingMetadata.groundingChunks as
    | Array<{ web?: { uri?: string; title?: string } }>
    | undefined;

  if (!chunks) return [];

  return chunks
    .filter((chunk) => chunk.web?.uri)
    .map((chunk) => ({
      title: chunk.web?.title || chunk.web?.uri || "",
      url: chunk.web?.uri || "",
    }));
}

function parseArticlesFromText(text: string): RawArticle[] {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]) as { articles?: RawArticle[] };
    return parsed.articles ?? [];
  } catch {
    return [];
  }
}

function dedupeArticles(articles: RawArticle[]): RawArticle[] {
  const seen = new Set<string>();
  const result: RawArticle[] = [];

  for (const article of articles) {
    const title = article.title?.trim();
    const url = article.url?.trim();
    if (!title || !url || !url.startsWith("http")) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    result.push({ title, url });
  }

  return result;
}

export async function searchNews(keyword: string): Promise<NewsItem[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: buildNewsSearchPrompt(keyword),
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text ?? "";
  const candidate = response.candidates?.[0];
  const groundingMetadata = candidate?.groundingMetadata as
    | Record<string, unknown>
    | undefined;

  const parsed = parseArticlesFromText(text);
  const grounded = extractFromGrounding(groundingMetadata);

  let rawArticles = dedupeArticles(
    parsed.length > 0 ? [...parsed, ...grounded] : grounded
  );

  if (rawArticles.length === 0) {
    throw new Error("No news articles found");
  }

  const urls = rawArticles.map((a) => a.url);
  const imageMap = await fetchOgImages(urls);

  return rawArticles.map((article) => ({
    title: article.title!,
    url: article.url!,
    imageUrl: imageMap.get(article.url!) ?? null,
  }));
}
