// services/ai/gemini.provider.ts
import { GoogleGenerativeAI, GenerativeModel, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { AIProvider, RecommendationParams, AIRecommendationResponse, TasteProfile } from './types';

export class GeminiProvider implements AIProvider {
  private model: GenerativeModel | null = null;  // ← Allow null
  private modelName: string = '';  // ← Initialize with empty string
  private isInitialized: boolean = false;

  constructor(apiKey: string, model = 'gemini-2.0-flash-lite-preview-02-05') {
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      console.warn('⚠️ Gemini API key is missing.');
      this.isInitialized = false;
      return;
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      this.model = genAI.getGenerativeModel({
        model: model,
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ],
        generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 1024 },
      });
      this.modelName = model;
      this.isInitialized = true;
      console.log(`✅ Gemini initialized with model: ${model}`);
    } catch (error) {
      console.error('❌ Failed to initialize Gemini:', error);
      this.isInitialized = false;
    }
  }

  async generateRecommendations(params: RecommendationParams): Promise<AIRecommendationResponse> {
    if (!this.isInitialized || !this.model) {
      return this.getFallbackRecommendations(params);
    }

    try {
      const prompt = this.buildRecommendationPrompt(params);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const usage = await result.response.usageMetadata;
      const parsed = this.parseRecommendationResponse(text);

      return {
        recommendations: parsed.recommendations || [],
        metadata: {
          model: this.modelName,
          tokensUsed: usage?.totalTokenCount || 0,
          latencyMs: 0,
          provider: 'gemini',
        },
      };
    } catch (error) {
      console.error('❌ Gemini error:', error);
      return this.getFallbackRecommendations(params);
    }
  }

  async explainRecommendation(content: any, userProfile: any): Promise<string> {
    if (!this.isInitialized || !this.model) {
      return this.getFallbackExplanation(content, userProfile);
    }

    try {
      const prompt = this.buildExplanationPrompt(content, userProfile);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text() || this.getFallbackExplanation(content, userProfile);
    } catch (error) {
      console.error('❌ Gemini explanation error:', error);
      return this.getFallbackExplanation(content, userProfile);
    }
  }

  async generateTasteProfile(history: any[]): Promise<TasteProfile> {
    if (!this.isInitialized || !this.model || history.length === 0) {
      return this.getDefaultTasteProfile();
    }

    try {
      const prompt = this.buildTasteProfilePrompt(history);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          genreAffinities: parsed.genreAffinities || {},
          preferredMoods: parsed.preferredMoods || [],
          preferredLanguages: parsed.preferredLanguages || ['en'],
          preferredRuntime: parsed.preferredRuntime || { min: 90, max: 150 },
          favoriteActors: parsed.favoriteActors || [],
          favoriteDirectors: parsed.favoriteDirectors || [],
        };
      }
      return this.getDefaultTasteProfile();
    } catch (error) {
      console.error('❌ Gemini taste profile error:', error);
      return this.getDefaultTasteProfile();
    }
  }

  private buildRecommendationPrompt(params: RecommendationParams): string {
    const { userTasteProfile, watchHistory, mood, language, minRuntime, maxRuntime, genres, limit = 10 } = params;

    return `You are BADMOUTH, an expert movie recommender AI.

## User Taste Profile:
${JSON.stringify(userTasteProfile || {}, null, 2)}

## Watch History:
${JSON.stringify(watchHistory?.slice(0, 20).map(h => ({
  title: h.content?.title || 'Unknown',
  rating: h.rating,
  liked: h.interaction_type === 'like' || h.rating >= 7,
})) || [], null, 2)}

## Preferences:
${mood ? `- Mood: ${mood}` : ''}
${language ? `- Language: ${language}` : ''}
${minRuntime && maxRuntime ? `- Runtime: ${minRuntime}-${maxRuntime} minutes` : ''}
${genres?.length ? `- Genres: ${genres.join(', ')}` : ''}

## Instructions:
Recommend ${limit} movies that match this user's taste profile.
Exclude movies they've already watched.
For each, provide: contentId (TMDB ID as string), score (0.0-1.0), reason (1-2 sentences).
Return ONLY valid JSON:
{
  "recommendations": [
    { "contentId": "12345", "score": 0.95, "reason": "..." }
  ]
}`;
  }

  private buildExplanationPrompt(content: any, userProfile: any): string {
    const topGenres = Object.entries(userProfile?.genreAffinities || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre)
      .join(', ');

    return `Explain why "${content.title}" is a great recommendation.
User loves: ${topGenres || 'various genres'}
Movie: ${content.title}
Overview: ${content.overview?.slice(0, 200) || 'N/A'}

Provide 2-3 sentences explaining the connection.`;
  }

  private buildTasteProfilePrompt(history: any[]): string {
    return `Based on this watching history, generate a taste profile:
${JSON.stringify(history.slice(0, 30).map(h => ({
  title: h.content?.title || 'Unknown',
  genre: h.content?.genre || 'Unknown',
  rating: h.rating,
})), null, 2)}

Return JSON:
{
  "genreAffinities": {"action": 0.85, "comedy": 0.73},
  "preferredMoods": ["mind-bending", "feel-good"],
  "preferredLanguages": ["en"],
  "preferredRuntime": {"min": 90, "max": 150},
  "favoriteActors": [],
  "favoriteDirectors": []
}`;
  }

  private parseRecommendationResponse(text: string): any {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
          return parsed;
        }
      }
    } catch (e) {}
    return { recommendations: [] };
  }

  private getFallbackRecommendations(params: RecommendationParams): AIRecommendationResponse {
    return { 
      recommendations: [], 
      metadata: { 
        model: 'fallback', 
        tokensUsed: 0, 
        latencyMs: 0, 
        provider: 'fallback' 
      } 
    };
  }

  private getFallbackExplanation(content: any, userProfile: any): string {
    return `Based on your preferences, "${content.title}" is a great match for you.`;
  }

  private getDefaultTasteProfile(): TasteProfile {
    return {
      genreAffinities: {},
      preferredMoods: [],
      preferredLanguages: ['en'],
      preferredRuntime: { min: 90, max: 150 },
      favoriteActors: [],
      favoriteDirectors: [],
    };
  }
}
