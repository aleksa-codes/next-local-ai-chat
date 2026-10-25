import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createOllama } from 'ai-sdk-ollama';

import { LocalAIProvider } from '@/lib/local-ai';

const ollama = createOllama();

const omlx = createOpenAICompatible({
  name: 'omlx',
  baseURL: process.env.OMLX_BASE_URL ?? 'http://localhost:8000/v1',
  apiKey: process.env.OMLX_API_KEY,
  includeUsage: true,
});

interface ResolveLanguageModelInput {
  provider: LocalAIProvider;
  model: string;
  supportsThinking?: boolean;
  keepAlive?: string | number;
}

export function resolveLanguageModel({ provider, model, supportsThinking, keepAlive }: ResolveLanguageModelInput) {
  if (provider === 'omlx') {
    return omlx(model);
  }

  return ollama(model, {
    think: supportsThinking,
    keep_alive: keepAlive,
  });
}

// Best-effort load-management call against the oMLX admin API. Unloading needs the
// exact model id, not the API-visible alias, so this fails cleanly if aliases differ.
export async function unloadOmlxModel(modelId: string): Promise<boolean> {
  try {
    const baseURL = (process.env.OMLX_BASE_URL ?? 'http://localhost:8000/v1').replace(/\/$/, '').replace(/\/v1$/, '');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (process.env.OMLX_API_KEY) {
      headers.Authorization = `Bearer ${process.env.OMLX_API_KEY}`;
    }

    const response = await fetch(`${baseURL}/admin/api/models/${encodeURIComponent(modelId)}/unload`, {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      console.warn(`[oMLX] Unload failed for "${modelId}": HTTP ${response.status} ${response.statusText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.warn('[oMLX] Unload request failed:', error);
    return false;
  }
}
