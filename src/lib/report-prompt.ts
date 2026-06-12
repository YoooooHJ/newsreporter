export function buildNewsSearchPrompt(keyword: string): string {
  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `당신은 전문 뉴스 리서처입니다. Google Search를 활용하여 "${keyword}" 키워드와 관련된 최근 7일 이내의 주요 뉴스를 조사하세요.

오늘 날짜: ${today}

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.

{
  "articles": [
    {
      "title": "뉴스 제목",
      "url": "https://실제-뉴스-기사-url"
    }
  ]
}

요구사항:
- articles 배열에 최소 12개, 최대 15개의 뉴스를 포함하세요.
- 반드시 최근 7일 이내의 실제 뉴스 기사만 포함하세요.
- 각 url은 실제 접근 가능한 뉴스 기사 URL이어야 합니다.
- title은 한국어로 작성하세요.
- 중복되거나 유사한 기사는 제외하세요.
- JSON 외의 마크다운, 설명, 코드블록을 출력하지 마세요.`;
}
