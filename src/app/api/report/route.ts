import { NextRequest, NextResponse } from "next/server";
import { searchNews } from "@/lib/gemini";

export const maxDuration = 60;

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
    console.error("News search failed:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          "뉴스 수집 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      },
      { status: 500 }
    );
  }
}
