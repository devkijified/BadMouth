// services/ai/provider.ts
import { AIProvider } from './types';
import { GeminiProvider } from './gemini.provider';

let providerInstance: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (!providerInstance) {
    const provider = process.env.AI_PROVIDER || 'gemini';
    const apiKey = process.env.GEMINI_API_KEY || '';
    providerInstance = new GeminiProvider(apiKey);
  }
  return providerInstance;
}
