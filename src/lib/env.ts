const ENV_KEYS = ["GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"] as const;

/**
 * Dynamic key lookup — prevents Next.js from baking `undefined` into the
 * server bundle when the variable is missing at build time on Vercel.
 */
function readEnv(key: string): string | undefined {
  const raw = process.env[key];
  return typeof raw === "string" ? raw.trim() : undefined;
}

export function getGeminiApiKey(): string {
  for (const key of ENV_KEYS) {
    const value = readEnv(key);
    if (value) return value;
  }

  throw new Error("GEMINI_API_KEY is not configured");
}

export function isGeminiApiKeyConfigured(): boolean {
  return ENV_KEYS.some((key) => Boolean(readEnv(key)));
}

export function getConfiguredEnvKey(): string | null {
  for (const key of ENV_KEYS) {
    if (readEnv(key)) return key;
  }
  return null;
}

export function getEnvDiagnostics() {
  return ENV_KEYS.map((key) => ({
    key,
    configured: Boolean(readEnv(key)),
  }));
}
