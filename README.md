# AI News Reporter

키워드를 입력하면 Gemini (`gemini-2.5-flash-lite`) + Google Search Grounding으로 최근 7일 이내 주요 뉴스를 수집해 보여주는 서비스입니다.

## 기능

- 키워드 기반 최근 7일 뉴스 수집
- 뉴스 카드: 제목 · OG 이미지 · URL
- 3개씩 표시 + 더보기 (3개씩 추가)
- 추천 키워드 클릭 시 즉시 검색

## 로컬 실행

```bash
npm install
cp .env.example .env.local
# .env.local에 GEMINI_API_KEY 설정
npm run dev
```

http://localhost:3000 에서 확인

로컬에서 `index.html` 단독 테스트: `npm run dev` 실행 후 http://localhost:3000/index.html 접속
(API 키는 서버 `.env.local`의 `GEMINI_API_KEY` 사용)

## Vercel 배포

1. GitHub 저장소 연결
2. Environment Variables에 `GEMINI_API_KEY` 등록
3. Deploy

API 키는 **서버 환경변수**로만 사용됩니다. 프론트엔드에 노출되지 않습니다.

## 환경 변수

| 변수 | 설명 |
|------|------|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) API 키 (Vercel Environment Variables에 등록) |
