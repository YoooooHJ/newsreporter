import { NextResponse } from "next/server";
import {
  getConfiguredEnvKey,
  getEnvDiagnostics,
  isGeminiApiKeyConfigured,
} from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const configured = isGeminiApiKeyConfigured();
  const envKey = getConfiguredEnvKey();

  return NextResponse.json({
    ok: configured,
    geminiKeyConfigured: configured,
    envKeyName: envKey,
    checked: getEnvDiagnostics(),
    hint: configured
      ? "API 키가 서버에 로드되었습니다."
      : "Vercel → Settings → Environment Variables → GEMINI_API_KEY (Production 체크) → Redeploy",
  });
}
