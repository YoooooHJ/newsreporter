"use client";

import { useCallback, useState } from "react";

const RECOMMENDED_KEYWORDS = [
  "OpenAI",
  "Gemini",
  "AI 반도체",
  "생성형 AI",
  "스타트업 투자",
  "공공데이터",
  "신약개발",
];

const PAGE_SIZE = 3;

const LOADING_MESSAGE = {
  line1: "최신 이슈를 수집하고 보고서를 작성하고 있습니다.",
  line2:
    "Gemini가 웹을 검색하는 중입니다. 보통 15~40초 정도 걸립니다.",
};

type NewsItem = {
  title: string;
  url: string;
  imageUrl: string | null;
};

function NewsCard({ item }: { item: NewsItem }) {
  const [imgError, setImgError] = useState(false);

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block overflow-hidden rounded-[12px] bg-white transition-transform duration-200 active:scale-[0.98]"
      style={{ boxShadow: "var(--card-shadow)" }}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-[var(--ceramic)]">
        {item.imageUrl && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.title}
            className="news-image h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-90"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[var(--ceramic)]">
            <span className="text-[3.2rem] opacity-30">📰</span>
          </div>
        )}
      </div>
      <div className="p-[1.6rem]">
        <h3
          className="mb-[0.8rem] text-[1.6rem] font-semibold leading-[1.4] text-[var(--text-black)] group-hover:text-[var(--green-accent)]"
          style={{ letterSpacing: "-0.01em" }}
        >
          {item.title}
        </h3>
        <p
          className="truncate text-[1.3rem] text-[var(--text-black-soft)]"
          style={{ letterSpacing: "-0.01em" }}
        >
          {item.url}
        </p>
      </div>
    </a>
  );
}

export default function Home() {
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [articles, setArticles] = useState<NewsItem[]>([]);
  const [searchedKeyword, setSearchedKeyword] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const searchNews = useCallback(async (searchKeyword: string) => {
    const trimmed = searchKeyword.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setArticles([]);
    setVisibleCount(PAGE_SIZE);
    setSearchedKeyword(trimmed);

    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: trimmed }),
      });

      const data = await res.json();

      if (data.success && Array.isArray(data.articles)) {
        setArticles(data.articles);
      } else {
        setError(data.message || "뉴스를 불러오지 못했습니다.");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, [loading]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    searchNews(keyword);
  }

  function handleKeywordClick(example: string) {
    setKeyword(example);
    searchNews(example);
  }

  const visibleArticles = articles.slice(0, visibleCount);
  const hasMore = visibleCount < articles.length;

  return (
    <div className="flex min-h-full flex-col">
      {/* Hero */}
      <header className="bg-[var(--house-green)] px-[1.6rem] py-[4rem] md:px-[4rem] md:py-[6.4rem]">
        <div className="mx-auto max-w-[720px] text-center">
          <p
            className="mb-[0.8rem] text-[1.4rem] font-semibold text-[var(--text-white-soft)]"
            style={{ letterSpacing: "-0.01em" }}
          >
            AI News Reporter
          </p>
          <h1
            className="mb-[1.6rem] text-[2.8rem] font-semibold text-white md:text-[3.6rem]"
            style={{ letterSpacing: "-0.16px", lineHeight: 1.2 }}
          >
            📰 AI News Reporter
          </h1>
          <p
            className="text-[1.6rem] leading-[1.75] text-[var(--text-white-soft)] md:text-[1.9rem]"
            style={{ letterSpacing: "-0.01em" }}
          >
            키워드를 입력하면 최근 7일 이내 주요 이슈를 자동으로 수집하여
            보고서를 생성합니다.
          </p>
        </div>
      </header>

      {/* Search */}
      <section className="px-[1.6rem] py-[3.2rem] md:px-[4rem]">
        <div className="mx-auto max-w-[720px]">
          <div
            className="rounded-[12px] bg-white p-[2.4rem] md:p-[3.2rem]"
            style={{ boxShadow: "var(--card-shadow)" }}
          >
            <form onSubmit={handleSubmit}>
              <label
                htmlFor="keyword"
                className="mb-[0.8rem] block text-[1.4rem] font-semibold text-[var(--text-black)]"
                style={{ letterSpacing: "-0.01em" }}
              >
                키워드
              </label>
              <input
                id="keyword"
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="예: OpenAI, AI 반도체"
                disabled={loading}
                maxLength={100}
                className="mb-[1.6rem] w-full rounded-[4px] border border-[#d6dbde] bg-white px-[1.2rem] py-[1.2rem] text-[1.6rem] text-[var(--text-black)] placeholder:text-[var(--text-black-soft)] focus:border-[var(--green-accent)] focus:outline-none disabled:opacity-50"
                style={{ letterSpacing: "-0.01em" }}
              />

              <button
                type="submit"
                disabled={loading || !keyword.trim()}
                className="w-full rounded-[50px] bg-[var(--green-accent)] px-[1.6rem] py-[1.4rem] text-[1.6rem] font-semibold text-white transition-all duration-200 hover:opacity-95 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ letterSpacing: "-0.01em" }}
              >
                {loading ? "수집 중..." : "보고서 생성"}
              </button>
            </form>

            {loading && (
              <div
                className="mt-[2.4rem] rounded-[12px] bg-[var(--ceramic)] px-[2rem] py-[2rem] text-center"
                role="status"
                aria-live="polite"
              >
                <div className="mx-auto mb-[1.6rem] flex h-[4rem] w-[4rem] items-center justify-center">
                  <div
                    className="loading-spinner h-[3.2rem] w-[3.2rem] rounded-full border-[3px] border-[var(--green-accent)] border-t-transparent"
                    aria-hidden="true"
                  />
                </div>
                <p
                  className="mb-[0.8rem] text-[1.6rem] font-semibold text-[var(--starbucks-green)]"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  {LOADING_MESSAGE.line1}
                </p>
                <p
                  className="text-[1.4rem] text-[var(--text-black-soft)]"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  {LOADING_MESSAGE.line2}
                </p>
              </div>
            )}

            {error && !loading && (
              <div
                className="mt-[2.4rem] rounded-[12px] border border-[#c82014]/20 bg-[#c82014]/5 px-[2rem] py-[1.6rem] text-[1.4rem] text-[#c82014]"
                role="alert"
              >
                {error}
              </div>
            )}

            <div className="mt-[2.4rem]">
              <p
                className="mb-[1.2rem] text-[1.3rem] text-[var(--text-black-soft)]"
                style={{ letterSpacing: "-0.01em" }}
              >
                추천 키워드
              </p>
              <div className="flex flex-wrap gap-[0.8rem]">
                {RECOMMENDED_KEYWORDS.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => handleKeywordClick(example)}
                    disabled={loading}
                    className="rounded-[50px] border border-[var(--green-accent)] bg-transparent px-[1.6rem] py-[0.7rem] text-[1.4rem] font-semibold text-[var(--green-accent)] transition-all duration-200 hover:bg-[var(--green-accent)] hover:text-white active:scale-95 disabled:opacity-50"
                    style={{ letterSpacing: "-0.01em" }}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      {articles.length > 0 && !loading && (
        <section className="px-[1.6rem] pb-[4rem] md:px-[4rem] md:pb-[6.4rem]">
          <div className="mx-auto max-w-[720px]">
            <h2
              className="mb-[2.4rem] text-[2.4rem] font-semibold text-[var(--starbucks-green)]"
              style={{ letterSpacing: "-0.16px", lineHeight: 1.5 }}
            >
              &lsquo;{searchedKeyword}&rsquo; 최신 이슈
            </h2>

            <div className="flex flex-col gap-[1.6rem]">
              {visibleArticles.map((item, index) => (
                <NewsCard key={`${item.url}-${index}`} item={item} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-[2.4rem] text-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="rounded-[50px] border border-[var(--green-accent)] bg-white px-[2.4rem] py-[1.2rem] text-[1.4rem] font-semibold text-[var(--green-accent)] transition-all duration-200 hover:bg-[var(--green-accent)] hover:text-white active:scale-95"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  더보기 ({articles.length - visibleCount}건 남음)
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-auto bg-[var(--house-green)] px-[1.6rem] py-[2.4rem] text-center md:px-[4rem]">
        <p
          className="text-[1.3rem] text-[var(--text-white-soft)]"
          style={{ letterSpacing: "-0.01em" }}
        >
          Powered by Gemini (Google Search Grounding) · Next.js
        </p>
      </footer>
    </div>
  );
}
