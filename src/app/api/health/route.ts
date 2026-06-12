import { NextResponse } from "next/server";
import { getConfiguredEnvKey, isGeminiApiKeyConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const configured = isGeminiApiKeyConfigured();
  const envKey = getConfiguredEnvKey();

  return NextResponse.json({
    ok: configured,
    geminiKeyConfigured: configured,
    envKeyName: envKey,
    hint: configured
      ? "API 키가 서버에 로드되었습니다."
      : "Vercel → Settings → Environment Variables에서 GEMINI_API_KEY를 Production에 등록 후 Redeploy 하세요.",
  });
}
