// services/ai/gemini.provider.ts

import { GoogleGenAI } from '@google/genai';
import {
  AIProvider,
  RecommendationParams,
  AIRecommendationResponse,
  TasteProfile,
  ReviewParams,
  AIReviewResponse,
} from './types';

export class GeminiProvider implements AIProvider {
  private ai: GoogleGenAI | null = null;
  private modelName: string;
  private isInitialized = false;

  constructor(
    apiKey: string,
    model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  ) {
    const cleanApiKey = apiKey?.trim();

    this.modelName = model;

    if (
      !cleanApiKey ||
      cleanApiKey === 'your_gemini_api_key_here'
    ) {
      console.warn('⚠️ Gemini API key is missing.');
      return;
    }

    try {
      this.ai = new GoogleGenAI({
        apiKey: cleanApiKey,
      });

      this.isInitialized = true;

      console.log(
        `✅ Gemini initialized with model: ${this.modelName}`
      );
    } catch (error) {
      console.error('❌ Failed to initialize Gemini:', error);
      this.isInitialized = false;
    }
  }

  private async generateText(prompt: string): Promise<string> {
    if (!this.isInitialized || !this.ai) {
      throw new Error('Gemini provider is not initialized');
    }

    const response = await this.ai.models.generateContent({
      model: this.modelName,
      contents: prompt,
      config: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1200,
      },
    });

    const text = response.text?.trim();

    if (!text) {
      throw new Error('Gemini returned an empty response');
    }

    return text;
  }

  async generateRecommendations(
    params: RecommendationParams
  ): Promise<AIRecommendationResponse> {
    if (!this.isInitialized) {
      return this.getFallbackRecommendations(params);
    }

    try {
      const prompt = this.buildRecommendationPrompt(params);
      const text = await this.generateText(prompt);
      const parsed = this.parseRecommendationResponse(text);

      return {
        recommendations: parsed.recommendations || [],
        metadata: {
          model: this.modelName,
          tokensUsed: 0,
          latencyMs: 0,
          provider: 'gemini',
        },
      };
    } catch (error) {
      console.error('❌ Gemini recommendation error:', error);

      return this.getFallbackRecommendations(params);
    }
  }

  async generateReview(
    params: ReviewParams
  ): Promise<AIReviewResponse> {
    if (!this.isInitialized) {
      throw new Error('Gemini provider is not initialized');
    }

    const prompt = `
You are BADMOUTH AI, a sharp but fair movie critic.

Write a concise review in two short paragraphs.

Rules:
- Be direct, entertaining, and specific.
- Discuss story, acting, pacing, direction, and overall enjoyment.
- Do not invent actors, plot details, or facts.
- Do not use Markdown headings.
- Do not include a numerical rating.

Movie title: ${params.title}
Year: ${params.year || 'Unknown'}
Genre: ${params.genre || 'Unknown'}
Existing rating: ${params.rating ?? 'N/A'}
Description: ${params.description || 'No description available'}
`;

    const review = await this.generateText(prompt);

    return {
      review,
      rating: null,
    };
  }

  async explainRecommendation(
    content: any,
    userProfile: any
  ): Promise<string> {
    if (!this.isInitialized) {
      return this.getFallbackExplanation(content, userProfile);
    }

    try {
      const prompt = this.buildExplanationPrompt(
        content,
        userProfile
      );

      return await this.generateText(prompt);
    } catch (error) {
      console.error('❌ Gemini explanation error:', error);

      return this.getFallbackExplanation(content, userProfile);
    }
  }

  async generateTasteProfile(
    history: any[]
  ): Promise<TasteProfile> {
    if (
      !this.isInitialized ||
      history.length === 0
    ) {
      return this.getDefaultTasteProfile();
    }

    try {
      const prompt = this.buildTasteProfilePrompt(history);
      const text = await this.generateText(prompt);
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        return this.getDefaultTasteProfile();
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        genreAffinities: parsed.genreAffinities || {},
        preferredMoods: parsed.preferredMoods || [],
        preferredLanguages:
          parsed.preferredLanguages || ['en'],
        preferredRuntime:
          parsed.preferredRuntime || {
            min: 90,
            max: 150,
          },
        favoriteActors: parsed.favoriteActors || [],
        favoriteDirectors: parsed.favoriteDirectors || [],
      };
    } catch (error) {
      console.error('❌ Gemini taste profile error:', error);

      return this.getDefaultTasteProfile();
    }
  }

  private buildRecommendationPrompt(
    params: RecommendationParams
  ): string {
    const {
      userTasteProfile,
      watchHistory,
      mood,
      language,
      minRuntime,
      maxRuntime,
      genres,
      limit = 10,
    } = params;

    return `
You are BADMOUTH, an expert movie recommender AI.

User taste profile:
${JSON.stringify(userTasteProfile || {}, null, 2)}

Watch history:
${JSON.stringify(
  watchHistory?.slice(0, 20).map((item: any) => ({
    title: item.content?.title || 'Unknown',
    rating: item.rating,
    liked:
      item.interaction_type === 'like' ||
      item.rating >= 7,
  })) || [],
  null,
  2
)}

Preferences:
${mood ? `Mood: ${mood}` : ''}
${language ? `Language: ${language}` : ''}
${
  minRuntime && maxRuntime
    ? `Runtime: ${minRuntime}-${maxRuntime} minutes`
    : ''
}
${genres?.length ? `Genres: ${genres.join(', ')}` : ''}

Recommend ${limit} movies.

Return only valid JSON:
{
  "recommendations": [
    {
      "contentId": "12345",
      "score": 0.95,
      "reason": "Short explanation"
    }
  ]
}
`;
  }

  private buildExplanationPrompt(
    content: any,
    userProfile: any
  ): string {
    const entries = Object.entries(
      userProfile?.genreAffinities || {}
    ) as [string, number][];

    const topGenres = entries
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre)
      .join(', ');

    return `
Explain why "${content.title}" is a good recommendation.

User likes: ${topGenres || 'various genres'}
Movie: ${content.title}
Overview: ${content.overview?.slice(0, 500) || 'N/A'}

Write 2 or 3 sentences.
`;
  }

  private buildTasteProfilePrompt(history: any[]): string {
    return `
Based on this watch history, generate a taste profile:

${JSON.stringify(
  history.slice(0, 30).map((item: any) => ({
    title: item.content?.title || 'Unknown',
    genre: item.content?.genre || 'Unknown',
    rating: item.rating,
  })),
  null,
  2
)}

Return only JSON:
{
  "genreAffinities": {
    "action": 0.85,
    "comedy": 0.73
  },
  "preferredMoods": ["mind-bending", "feel-good"],
  "preferredLanguages": ["en"],
  "preferredRuntime": {
    "min": 90,
    "max": 150
  },
  "favoriteActors": [],
  "favoriteDirectors": []
}
`;
  }

  private parseRecommendationResponse(text: string): any {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        return { recommendations: [] };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (
        parsed.recommendations &&
        Array.isArray(parsed.recommendations)
      ) {
        return parsed;
      }
    } catch (error) {
      console.error(
        '❌ Failed to parse recommendations:',
        error
      );
    }

    return { recommendations: [] };
  }

  private getFallbackRecommendations(
    params: RecommendationParams
  ): AIRecommendationResponse {
    return {
      recommendations: [],
      metadata: {
        model: 'fallback',
        tokensUsed: 0,
        latencyMs: 0,
        provider: 'fallback',
      },
    };
  }

  private getFallbackExplanation(
    content: any,
    userProfile: any
  ): string {
    return `Based on your preferences, "${content.title}" is a great match for you.`;
  }

  private getDefaultTasteProfile(): TasteProfile {
    return {
      genreAffinities: {},
      preferredMoods: [],
      preferredLanguages: ['en'],
      preferredRuntime: {
        min: 90,
        max: 150,
      },
      favoriteActors: [],
      favoriteDirectors: [],
    };
  }
}
