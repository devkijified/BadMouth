// backend/src/services/ai/gemini.provider.ts
import { GoogleGenerativeAI, GenerativeModel, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { AIProvider, RecommendationParams, AIRecommendationResponse, TasteProfile } from './types';

export class GeminiProvider implements AIProvider {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private modelName: string;
  private isInitialized: boolean = false;
  private apiKey: string;

  constructor(apiKey: string, model = 'gemini-2.0-flash-lite-preview-02-05') {
    this.apiKey = apiKey;
    
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      console.warn('⚠️ Gemini API key is missing or invalid. Using fallback mode.');
      this.isInitialized = false;
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({
        model: model,
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      });
      this.modelName = model;
      this.isInitialized = true;
      console.log(`✅ Gemini provider initialized with model: ${model}`);
    } catch (error) {
      console.error('❌ Failed to initialize Gemini:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Generate personalized recommendations using Gemini
   */
  async generateRecommendations(params: RecommendationParams): Promise<AIRecommendationResponse> {
    const startTime = Date.now();

    if (!this.isInitialized) {
      console.log('📊 Gemini not initialized, using fallback');
      return this.getFallbackRecommendations(params);
    }

    try {
      const prompt = this.buildRecommendationPrompt(params);
      console.log('📝 Sending request to Gemini...');
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Log token usage for cost tracking
      const usage = await result.response.usageMetadata;
      if (usage) {
        console.log(`📊 Gemini Token Usage - Prompt: ${usage.promptTokenCount}, Response: ${usage.candidatesTokenCount}, Total: ${usage.totalTokenCount}`);
      }

      // Parse the JSON response
      const parsed = this.parseRecommendationResponse(text);
      
      // Ensure we have recommendations
      if (!parsed.recommendations || parsed.recommendations.length === 0) {
        console.warn('⚠️ No recommendations found in Gemini response, using fallback');
        return this.getFallbackRecommendations(params);
      }

      return {
        recommendations: parsed.recommendations,
        metadata: {
          model: this.modelName,
          tokensUsed: usage?.totalTokenCount || 0,
          latencyMs: Date.now() - startTime,
          provider: 'gemini',
        },
      };
    } catch (error) {
      console.error('❌ Gemini recommendation error:', error);
      return this.getFallbackRecommendations(params);
    }
  }

  /**
   * Generate an explanation for why a movie is recommended
   */
  async explainRecommendation(content: any, userProfile: any): Promise<string> {
    if (!this.isInitialized) {
      return this.getFallbackExplanation(content, userProfile);
    }

    try {
      const prompt = this.buildExplanationPrompt(content, userProfile);
      console.log('📝 Generating explanation...');
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return text || this.getFallbackExplanation(content, userProfile);
    } catch (error) {
      console.error('❌ Gemini explanation error:', error);
      return this.getFallbackExplanation(content, userProfile);
    }
  }

  /**
   * Generate a taste profile from watch history
   */
  async generateTasteProfile(history: any[]): Promise<TasteProfile> {
    if (!this.isInitialized || history.length === 0) {
      console.log('📊 Using default taste profile (no history or Gemini not initialized)');
      return this.getDefaultTasteProfile();
    }

    try {
      const prompt = this.buildTasteProfilePrompt(history);
      console.log('📝 Generating taste profile...');
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Try to parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            genreAffinities: parsed.genreAffinities || {},
            preferredMoods: parsed.preferredMoods || [],
            preferredLanguages: parsed.preferredLanguages || ['en'],
            preferredRuntime: parsed.preferredRuntime || { min: 90, max: 150 },
            favoriteActors: parsed.favoriteActors || [],
            favoriteDirectors: parsed.favoriteDirectors || [],
          };
        } catch (e) {
          console.warn('⚠️ Could not parse Gemini taste profile as JSON, using default');
        }
      }

      return this.getDefaultTasteProfile();
    } catch (error) {
      console.error('❌ Gemini taste profile error:', error);
      return this.getDefaultTasteProfile();
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Private helper methods
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Build the recommendation prompt for Gemini
   */
  private buildRecommendationPrompt(params: RecommendationParams): string {
    const { userTasteProfile, watchHistory, mood, language, minRuntime, maxRuntime, genres, limit = 10 } = params;

    let prompt = `You are BADMOUTH, an expert movie recommender AI. Your job is to recommend movies based on user taste profiles.

## User Taste Profile:
${JSON.stringify(userTasteProfile || {}, null, 2)}

## Watch History (watched, rated, liked, disliked):
${JSON.stringify(watchHistory?.slice(0, 20).map(h => ({
  title: h.content?.title || 'Unknown',
  rating: h.rating,
  liked: h.interaction_type === 'like' || h.rating >= 7,
})) || [], null, 2)}

## Current Preferences:
${mood ? `- Mood: ${mood}` : ''}
${language ? `- Language: ${language}` : ''}
${minRuntime && maxRuntime ? `- Runtime: ${minRuntime}-${maxRuntime} minutes` : ''}
${genres?.length ? `- Preferred Genres: ${genres.join(', ')}` : ''}

## Instructions:
1. Recommend ${limit} movies that match this user's taste profile
2. Exclude movies they've already watched
3. For each recommendation, provide:
   - contentId: (TMDB ID as a string)
   - score: 0.0-1.0 (match confidence)
   - reason: 1-2 sentences explaining WHY this is a good match
4. Prioritize movies that match their top genres and preferences
5. Return ONLY valid JSON in this exact format:

{
  "recommendations": [
    {
      "contentId": "12345",
      "score": 0.95,
      "reason": "Because you loved psychological thrillers like [example], this movie offers a similar mind-bending experience..."
    }
  ]
}`;

    return prompt;
  }

  /**
   * Build the explanation prompt for Gemini
   */
  private buildExplanationPrompt(content: any, userProfile: any): string {
    const topGenres = Object.entries(userProfile?.genreAffinities || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre, score]) => `${genre} (${Math.round(score * 100)}%)`)
      .join(', ');

    return `Explain why "${content.title}" would be a great recommendation for this user.

User loves: ${topGenres || 'various genres'}

Movie: ${content.title}
Overview: ${content.overview?.slice(0, 300) || 'N/A'}
Release Year: ${content.year || 'N/A'}
Rating: ${content.rating || 'N/A'}/10

Provide a compelling 2-3 sentence explanation that connects their preferences to this movie. Be specific, enthusiastic, and natural.

Example: "Based on your love for mind-bending sci-fi like Inception, this movie will keep you on the edge of your seat with its clever plot twists and stunning visuals."`;

    return prompt;
  }

  /**
   * Build the taste profile prompt for Gemini
   */
  private buildTasteProfilePrompt(history: any[]): string {
    return `Based on this user's watching history and ratings, generate a detailed taste profile.

Watching History:
${JSON.stringify(history.slice(0, 50).map(h => ({
  title: h.content?.title || 'Unknown',
  genre: h.content?.genre || 'Unknown',
  rating: h.rating,
  liked: h.interaction_type === 'like' || h.rating >= 7,
})), null, 2)}

Return ONLY valid JSON in this exact format:
{
  "genreAffinities": {"action": 0.85, "comedy": 0.73, "drama": 0.68},
  "preferredMoods": ["mind-bending", "feel-good", "suspenseful"],
  "preferredLanguages": ["en", "es"],
  "preferredRuntime": {"min": 90, "max": 150},
  "favoriteActors": ["Leonardo DiCaprio", "Tom Hanks"],
  "favoriteDirectors": ["Christopher Nolan", "Steven Spielberg"]
}`;
  }

  /**
   * Parse the recommendation response from Gemini
   */
  private parseRecommendationResponse(text: string): any {
    try {
      // Try to find JSON in the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // Validate that it has recommendations
        if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('⚠️ Could not parse Gemini response as JSON');
    }
    
    // Try to extract recommendations from text
    const lines = text.split('\n').filter(line => line.trim());
    const recommendations = [];
    
    for (const line of lines) {
      // Look for patterns like "contentId", "score", "reason"
      if (line.includes('contentId') || line.includes('"contentId"')) {
        try {
          // Try to parse individual JSON objects
          const objMatch = line.match(/\{[\s\S]*?\}/);
          if (objMatch) {
            const obj = JSON.parse(objMatch[0]);
            if (obj.contentId && obj.score && obj.reason) {
              recommendations.push(obj);
            }
          }
        } catch (e) {
          // Skip invalid lines
        }
      }
    }
    
    return { recommendations };
  }

  /**
   * Fallback recommendations when Gemini is not available
   */
  private getFallbackRecommendations(params: RecommendationParams): AIRecommendationResponse {
    console.log('📊 Using fallback recommendations (TMDB trending)');
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

  /**
   * Fallback explanation when Gemini is not available
   */
  private getFallbackExplanation(content: any, userProfile: any): string {
    const topGenre = Object.entries(userProfile?.genreAffinities || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 1)
      .map(([genre]) => genre)[0] || 'your favorite genres';

    return `Based on your love for ${topGenre}, "${content.title}" is a great match that aligns with your viewing preferences.`;
  }

  /**
   * Default taste profile when no history is available
   */
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
