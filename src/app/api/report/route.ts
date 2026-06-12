import { NextRequest, NextResponse } from "next/server";
import { searchNews } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const keyword = typeof body.keyword === "string" ? body.keyword.trim() : "";

    if (!keyword) {
      return NextResponse.json(
        { success: false, message: "키워드를 입력해 주세요." },
        { status: 400 }
      );
    }

    if (keyword.length > 100) {
      return NextResponse.json(
        { success: false, message: "키워드는 100자 이내로 입력해 주세요." },
        { status: 400 }
      );
    }

    const articles = await searchNews(keyword);

    return NextResponse.json({
      success: true,
      keyword,
      articles,
    });
  } catch (error) {
    const detail = getErrorMessage(error);
    console.error("News search failed:", detail, error);

    const isConfigError = detail.includes("GEMINI_API_KEY");
    const userMessage = isConfigError
      ? "서버 API 키가 설정되지 않았습니다. Vercel 환경변수를 확인해 주세요."
      : detail.includes("Gemini API")
        ? "Gemini API 연결에 실패했습니다. API 키와 결제 설정을 확인해 주세요."
        : "뉴스 수집 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";

    return NextResponse.json(
      {
        success: false,
        message: userMessage,
        ...(process.env.NODE_ENV === "development" ? { detail } : {}),
      },
      { status: 500 }
    );
  }
}
