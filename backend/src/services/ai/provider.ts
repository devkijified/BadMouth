// backend/src/services/ai/provider.ts
import { AIProvider, RecommendationParams, AIRecommendationResponse, TasteProfile } from './types';
import { GeminiProvider } from './gemini.provider';
// import { OpenAIProvider } from './gpt.provider';
// import { DeepSeekProvider } from './deepseek.provider';

export class AIProviderFactory {
  static createProvider(provider: string, apiKey: string): AIProvider {
    switch (provider.toLowerCase()) {
      case 'gemini':
        return new GeminiProvider(apiKey);
      // case 'openai':
      //   return new OpenAIProvider(apiKey);
      // case 'deepseek':
      //   return new DeepSeekProvider(apiKey);
      default:
        console.warn(`Unknown provider: ${provider}, falling back to Gemini`);
        return new GeminiProvider(apiKey);
    }
  }
}

// Export singleton instance
let providerInstance: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (!providerInstance) {
    const provider = process.env.AI_PROVIDER || 'gemini';
    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || '';
    providerInstance = AIProviderFactory.createProvider(provider, apiKey);
  }
  return providerInstance;
}
