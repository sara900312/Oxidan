// Server-only: OpenRouter AI Gateway provider
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createGateway() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("Missing OPENROUTER_API_KEY");
  return createOpenAICompatible({
    name: "openrouter",
    baseURL: "https://openrouter.ai/api/v1",
    supportsStructuredOutputs: false,
    headers: {
      "Authorization": `Bearer ${key}`,
      "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
      "X-Title": "AI Analysis Service",
    },
  });
}

// Default: efficient model with lower token usage
export const DEFAULT_MODEL = "openai/gpt-3.5-turbo";

// Token optimization settings
export const ANALYSIS_CONFIG = {
  maxTokens: 500,
  temperature: 0.5,
  topP: 0.8,
};
