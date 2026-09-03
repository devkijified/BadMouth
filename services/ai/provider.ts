// services/ai/provider.ts
import { AIProvider } from './types';
import { GeminiProvider } from './gemini.provider';

let providerInstance: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (!providerInstance) {
    const provider = process.env.AI_PROVIDER || 'gemini';
    const apiKey = process.env.GEMINI_API_KEY || '';
    
    console.log(`🔧 Initializing AI provider: ${provider}`);
    
    switch (provider.toLowerCase()) {
      case 'gemini':
        providerInstance = new GeminiProvider(apiKey);
        break;
      default:
        console.warn(`Unknown provider: ${provider}, falling back to Gemini`);
        providerInstance = new GeminiProvider(apiKey);
    }
  }
  return providerInstance;
}
