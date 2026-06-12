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

## Vercel 환경변수 설정 (필수)

1. [Vercel Dashboard](https://vercel.com) → **newsreporter** 프로젝트 선택
2. **Settings** → **Environment Variables**
3. 아래처럼 추가:

| Key | Value | Environment |
|-----|-------|-------------|
| `GEMINI_API_KEY` | Google AI Studio API 키 | **Production** (Preview도 권장) |

4. **Save** 후 **Deployments** → 최신 배포 → **⋯** → **Redeploy** (환경변수 추가 후 반드시 재배포)

### API 키 등록 확인

배포 URL에서 아래 주소를 열어 `geminiKeyConfigured: true` 인지 확인:

```
https://your-app.vercel.app/api/health
```

`false`이면 환경변수 이름·Production 체크·Redeploy를 다시 확인하세요.

**주의**
- 변수 이름은 정확히 `GEMINI_API_KEY` (띄어쓰기·따옴표 없음)
- 값 앞뒤 공백 없이 붙여넣기
- `NEXT_PUBLIC_` 접두사 사용 금지 (키가 브라우저에 노출됨)

## 환경 변수

| 변수 | 설명 |
|------|------|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) API 키 (Vercel Environment Variables에 등록) |
