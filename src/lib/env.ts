const ENV_KEYS = ["GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"] as const;

export function getGeminiApiKey(): string {
  for (const key of ENV_KEYS) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }

  throw new Error("GEMINI_API_KEY is not configured");
}

export function isGeminiApiKeyConfigured(): boolean {
  return ENV_KEYS.some((key) => Boolean(process.env[key]?.trim()));
}

export function getConfiguredEnvKey(): string | null {
  for (const key of ENV_KEYS) {
    if (process.env[key]?.trim()) return key;
  }
  return null;
}
